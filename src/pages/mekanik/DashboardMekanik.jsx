import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw, Wrench, Clock, CheckCircle2, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles,
  CalendarClock, Package, Timer,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const ICON_MAP = { wrench: Wrench, engine: Settings2, bolt: Zap, wheel: Disc3, oil: Droplet, car: Car, aircon: Wind, sparkles: Sparkles }
function IconFor({ name, size = 16 }) {
  const Comp = ICON_MAP[name] || Wrench
  return <Comp size={size} />
}

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getTodayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getMonthRangeISO() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  return { start, end }
}

function formatDurasi(menitTotal) {
  if (!menitTotal || menitTotal <= 0) return '-'
  const jam = Math.floor(menitTotal / 60)
  const menit = Math.round(menitTotal % 60)
  if (jam === 0) return `${menit}m`
  return `${jam}j ${menit}m`
}

const STATUS_LABEL = { dijadwalkan: 'Menunggu', diproses: 'Dikerjakan', selesai: 'Selesai' }
const STATUS_CLASS = {
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardMekanik() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [namaMekanik, setNamaMekanik] = useState('')

  const [pekerjaanHariIni, setPekerjaanHariIni] = useState(0)
  const [sedangDikerjakan, setSedangDikerjakan] = useState(0)
  const [selesaiBulanIni, setSelesaiBulanIni] = useState(0)
  const [sparepartTerpakai, setSparepartTerpakai] = useState(0)
  const [rataRataMenit, setRataRataMenit] = useState(0)
  const [antrian, setAntrian] = useState([])
  const [riwayat, setRiwayat] = useState([])
  const [updatingId, setUpdatingId] = useState(null)

  async function loadDashboard() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      setNamaMekanik(profile?.full_name ?? '')

      const todayStr = getTodayISO()
      const { start, end } = getMonthRangeISO()

      const [
        hariIniRes,
        dikerjakanRes,
        bookingBulanIniRes,
        antrianRes,
        riwayatRes,
      ] = await Promise.all([
        supabase.from('booking').select('id', { count: 'exact', head: true }).eq('mekanik_id', user.id).eq('tanggal', todayStr),
        supabase.from('booking').select('id', { count: 'exact', head: true }).eq('mekanik_id', user.id).eq('status', 'diproses'),
        // Ambil semua booking selesai bulan ini punya mekanik ini (dipakai buat 3 metrik ringkasan sekaligus)
        supabase
          .from('booking')
          .select('id')
          .eq('mekanik_id', user.id)
          .eq('status', 'selesai')
          .gte('created_at', start)
          .lt('created_at', end),
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status, catatan,
            customer:customer_id ( full_name ),
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama, icon )
          `)
          .eq('mekanik_id', user.id)
          .in('status', ['dijadwalkan', 'diproses'])
          .order('tanggal', { ascending: true })
          .order('waktu', { ascending: true })
          .limit(5),
        supabase
          .from('booking')
          .select(`
            id, tanggal,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama, icon )
          `)
          .eq('mekanik_id', user.id)
          .eq('status', 'selesai')
          .order('tanggal', { ascending: false })
          .limit(4),
      ])

      for (const res of [hariIniRes, dikerjakanRes, bookingBulanIniRes, antrianRes, riwayatRes]) {
        if (res.error) throw res.error
      }

      setPekerjaanHariIni(hariIniRes.count ?? 0)
      setSedangDikerjakan(dikerjakanRes.count ?? 0)
      setAntrian(antrianRes.data ?? [])
      setRiwayat(riwayatRes.data ?? [])

      const bookingSelesaiIds = (bookingBulanIniRes.data ?? []).map((b) => b.id)
      setSelesaiBulanIni(bookingSelesaiIds.length)

      if (bookingSelesaiIds.length > 0) {
        const [sparepartRes, logRes] = await Promise.all([
          supabase.from('servis_sparepart').select('qty').in('booking_id', bookingSelesaiIds),
          supabase.from('booking_status_log').select('booking_id, status, created_at').in('booking_id', bookingSelesaiIds),
        ])
        if (sparepartRes.error) throw sparepartRes.error
        if (logRes.error) throw logRes.error

        const totalSparepart = (sparepartRes.data ?? []).reduce((sum, s) => sum + (s.qty || 0), 0)
        setSparepartTerpakai(totalSparepart)

        // Hitung rata-rata durasi dari status 'diproses' -> 'selesai' per booking, dari log asli
        const perBooking = new Map()
        for (const log of logRes.data ?? []) {
          if (!perBooking.has(log.booking_id)) perBooking.set(log.booking_id, {})
          if (log.status === 'diproses' || log.status === 'selesai') {
            perBooking.get(log.booking_id)[log.status] = new Date(log.created_at)
          }
        }
        const durasiList = []
        for (const { diproses, selesai } of perBooking.values()) {
          if (diproses && selesai && selesai > diproses) {
            durasiList.push((selesai - diproses) / 60000) // ke menit
          }
        }
        const rataRata = durasiList.length > 0 ? durasiList.reduce((a, b) => a + b, 0) / durasiList.length : 0
        setRataRataMenit(rataRata)
      } else {
        setSparepartTerpakai(0)
        setRataRataMenit(0)
      }
    } catch (err) {
      console.error('Gagal memuat dashboard mekanik:', err)
      setError(err.message || 'Gagal memuat data dashboard')
    }
  }

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }

  async function handleUpdateStatus(bookingId, statusBaru) {
    setUpdatingId(bookingId)
    try {
      const { error: updateError } = await supabase.from('booking').update({ status: statusBaru }).eq('id', bookingId)
      if (updateError) throw updateError
      await loadDashboard()
    } catch (err) {
      alert('Gagal update status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat dashboard...</div>
  }

  // Cuma pekerjaan PALING DEPAN yang berstatus "dijadwalkan" yang bisa langsung dimulai;
  // sisanya (walau statusnya juga dijadwalkan) cuma bisa dilihat detailnya dulu.
  const idDijadwalkanPertama = antrian.find((j) => j.status === 'dijadwalkan')?.id

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      {/* Topbar */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Selamat datang{namaMekanik ? `, ${namaMekanik.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Berikut pekerjaan servis Anda hari ini,{' '}
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:text-slate-800"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="h-9 w-9 rounded-full bg-indigo-900" />
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Stat cards */}
      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Wrench size={16} />} iconBg="bg-indigo-100" label="Pekerjaan Hari Ini" value={pekerjaanHariIni} />
        <StatCard icon={<Clock size={16} />} iconBg="bg-amber-100" label="Sedang Dikerjakan" value={sedangDikerjakan} />
        <StatCard icon={<CheckCircle2 size={16} />} iconBg="bg-emerald-100" label="Selesai Bulan Ini" value={selesaiBulanIni} />
      </section>

      {/* Antrian pekerjaan */}
      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Antrian Pekerjaan Berikutnya</h2>
          <Link to="/mekanik/pekerjaan" className="text-xs font-medium text-indigo-600 hover:underline">
            Lihat Semua →
          </Link>
        </div>

        {antrian.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada pekerjaan yang ditugaskan.</p>
        ) : (
          <ul className="space-y-3">
            {antrian.map((job) => (
              <li key={job.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <IconFor name={job.layanan?.icon} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {job.layanan?.nama ?? '-'} — {[job.kendaraan?.merek, job.kendaraan?.model].filter(Boolean).join(' ')} {job.kendaraan?.plat_nomor}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {job.customer?.full_name ?? '-'} • {formatTanggal(job.tanggal)}, {job.waktu?.slice(0, 5)} WIB
                    </p>
                    {job.catatan && <p className="mt-0.5 text-xs text-slate-400">Keluhan: {job.catatan}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[job.status]}`}>
                    {STATUS_LABEL[job.status]}
                  </span>
                  {job.status === 'diproses' && (
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'selesai')}
                      disabled={updatingId === job.id}
                      className="rounded-lg bg-indigo-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {updatingId === job.id ? '...' : 'Update Status'}
                    </button>
                  )}
                  {job.status === 'dijadwalkan' && job.id === idDijadwalkanPertama && (
                    <button
                      onClick={() => handleUpdateStatus(job.id, 'diproses')}
                      disabled={updatingId === job.id}
                      className="rounded-lg bg-indigo-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {updatingId === job.id ? '...' : 'Mulai Servis'}
                    </button>
                  )}
                  {job.status === 'dijadwalkan' && job.id !== idDijadwalkanPertama && (
                    <button
                      onClick={() => alert('Halaman detail pekerjaan belum dibikin.')}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Lihat Detail
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Riwayat + Ringkasan bulan ini */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Riwayat Pekerjaan Terakhir</h2>
            <Link to="/mekanik/riwayat" className="text-xs font-medium text-indigo-600 hover:underline">
              Lihat Semua →
            </Link>
          </div>
          {riwayat.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada riwayat pekerjaan.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {riwayat.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <IconFor name={r.layanan?.icon} size={14} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{r.layanan?.nama ?? '-'}</p>
                    <p className="text-xs text-slate-400">
                      {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Ringkasan Bulan Ini</h2>
          <ul className="divide-y divide-slate-50">
            <RingkasanRow icon={<CheckCircle2 size={15} className="text-emerald-600" />} label="Servis Diselesaikan" value={selesaiBulanIni} />
            <RingkasanRow icon={<Package size={15} className="text-indigo-600" />} label="Sparepart Terpakai" value={sparepartTerpakai} />
            <RingkasanRow icon={<Timer size={15} className="text-amber-600" />} label="Rata-rata Waktu Servis" value={formatDurasi(rataRataMenit)} />
          </ul>
          {rataRataMenit === 0 && selesaiBulanIni > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              * Rata-rata waktu belum bisa dihitung — belum ada riwayat status "Dikerjakan → Selesai" yang lengkap di log bulan ini.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function RingkasanRow({ icon, label, value }) {
  return (
    <li className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-sm text-slate-700">
        {icon}
        {label}
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </li>
  )
}