import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw, AlertTriangle, Wrench, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import { StatCard, PillChart, Gauge, toISO, getWeekDays } from '../../components/DashboardParts'

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

function formatDurasi(menitTotal) {
  if (!menitTotal || menitTotal <= 0) return '-'
  const jam = Math.floor(menitTotal / 60)
  const menit = Math.round(menitTotal % 60)
  if (jam === 0) return `${menit}m`
  return `${jam}j ${menit}m`
}

const STATUS_LABEL = { dijadwalkan: 'Menunggu', diproses: 'Dikerjakan', selesai: 'Selesai' }
const STATUS_CLASS = {
  dijadwalkan: 'bg-amber-50 text-amber-700 ring-amber-100',
  diproses: 'bg-blue-50 text-blue-700 ring-blue-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

const DATA_AWAL = {
  nama: '',
  hariIni: 0,
  dikerjakan: 0,
  selesaiBulanIni: 0,
  sparepart: 0,
  rataRataMenit: 0,
  statusCounts: {},
  mingguan: [],
  antrian: [],
  riwayat: [],
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardMekanik() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(DATA_AWAL)
  const [updatingId, setUpdatingId] = useState(null)

  async function loadDashboard() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const now = new Date()
      const todayStr = toISO(now)
      const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1)
      const minggu = getWeekDays()

      const [profileRes, semuaRes, antrianRes, riwayatRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('booking').select('id, status, tanggal, created_at').eq('mekanik_id', user.id),
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status, catatan,
            customer:customer_id ( full_name, avatar_url ),
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

      for (const res of [semuaRes, antrianRes, riwayatRes]) {
        if (res.error) throw res.error
      }

      // Semua angka ringkasan dihitung dari satu query
      const statusCounts = {}
      const perHari = new Map()
      const selesaiBulanIds = []
      let hariIni = 0
      for (const b of semuaRes.data ?? []) {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
        if (b.tanggal === todayStr) hariIni += 1
        if (b.status !== 'dibatalkan' && b.tanggal) perHari.set(b.tanggal, (perHari.get(b.tanggal) || 0) + 1)
        if (b.status === 'selesai' && new Date(b.created_at) >= awalBulan) selesaiBulanIds.push(b.id)
      }

      let sparepart = 0
      let rataRataMenit = 0
      if (selesaiBulanIds.length > 0) {
        const [sparepartRes, logRes] = await Promise.all([
          supabase.from('servis_sparepart').select('qty').in('booking_id', selesaiBulanIds),
          supabase.from('booking_status_log').select('booking_id, status, created_at').in('booking_id', selesaiBulanIds),
        ])
        if (sparepartRes.error) throw sparepartRes.error
        if (logRes.error) throw logRes.error

        sparepart = (sparepartRes.data ?? []).reduce((sum, s) => sum + (s.qty || 0), 0)

        const perBooking = new Map()
        for (const log of logRes.data ?? []) {
          if (!perBooking.has(log.booking_id)) perBooking.set(log.booking_id, {})
          if (log.status === 'diproses' || log.status === 'selesai') {
            perBooking.get(log.booking_id)[log.status] = new Date(log.created_at)
          }
        }
        const durasi = []
        for (const { diproses, selesai } of perBooking.values()) {
          if (diproses && selesai && selesai > diproses) durasi.push((selesai - diproses) / 60000)
        }
        rataRataMenit = durasi.length > 0 ? durasi.reduce((a, b) => a + b, 0) / durasi.length : 0
      }

      setData({
        nama: profileRes.data?.full_name ?? '',
        hariIni,
        dikerjakan: statusCounts.diproses || 0,
        selesaiBulanIni: selesaiBulanIds.length,
        sparepart,
        rataRataMenit,
        statusCounts,
        mingguan: minggu.map((d) => ({ ...d, jumlah: perHari.get(d.key) || 0 })),
        antrian: antrianRes.data ?? [],
        riwayat: riwayatRes.data ?? [],
      })
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

  const { nama, hariIni, dikerjakan, selesaiBulanIni, sparepart, rataRataMenit, statusCounts, mingguan, antrian, riwayat } = data

  // Pekerjaan berikutnya: yang lagi dikerjakan dulu, kalau tidak ada ambil antrian terdepan
  const berikutnya = antrian.find((j) => j.status === 'diproses') ?? antrian[0] ?? null
  const totalMinggu = mingguan.reduce((sum, d) => sum + d.jumlah, 0)
  const namaDepan = nama ? nama.split(' ')[0] : ''

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Selamat datang{namaDepan ? `, ${namaDepan}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Pekerjaan servis Anda, {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-[#12123a]"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link
            to="/mekanik/pekerjaan"
            className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
          >
            Daftar Pekerjaan
          </Link>
          <Link
            to="/mekanik/riwayat"
            className="rounded-full border border-[#12123a] px-6 py-3 text-sm font-semibold text-[#12123a] transition hover:bg-white"
          >
            Riwayat Pekerjaan
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertTriangle size={16} /> Gagal memuat sebagian data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Baris 1: statistik */}
        <StatCard
          highlight
          title="Pekerjaan Hari Ini"
          value={hariIni}
          href="/mekanik/pekerjaan"
          note={hariIni > 0 ? 'jadwal servis hari ini' : 'Belum ada jadwal hari ini'}
        />
        <StatCard
          title="Sedang Dikerjakan"
          value={dikerjakan}
          href="/mekanik/pekerjaan"
          note={dikerjakan > 0 ? 'pekerjaan berjalan' : 'Tidak ada yang berjalan'}
        />
        <StatCard
          title="Selesai Bulan Ini"
          value={selesaiBulanIni}
          href="/mekanik/riwayat"
          note="servis diselesaikan"
        />
        <StatCard
          title="Sparepart Terpakai"
          value={sparepart}
          href="/mekanik/riwayat"
          note="unit bulan ini"
        />

        {/* Baris 2: analitik */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-6">
            <h2 className="text-[15px] font-semibold text-slate-900">Pekerjaan Minggu Ini</h2>
            <p className="mt-0.5 text-xs text-slate-400">{totalMinggu} pekerjaan, Senin sampai Minggu</p>
          </div>
          <PillChart data={mingguan} />
        </div>

        <div className="flex flex-col rounded-3xl bg-white p-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Pekerjaan Berikutnya</h2>
          {berikutnya ? (
            <>
              <div className="mt-5 flex-1">
                <p className="text-xl font-semibold leading-snug text-[#12123a]">{berikutnya.layanan?.nama ?? '-'}</p>
                <p className="mt-1 text-sm text-slate-500">{berikutnya.customer?.full_name ?? '-'}</p>
                <p className="mt-3 text-sm text-slate-400">
                  {formatTanggal(berikutnya.tanggal)}
                  {berikutnya.waktu ? `, ${berikutnya.waktu.slice(0, 5)} WIB` : ''}
                </p>
                <p className="text-sm text-slate-400">
                  {[berikutnya.kendaraan?.merek, berikutnya.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                  {berikutnya.kendaraan?.plat_nomor ? ` · ${berikutnya.kendaraan.plat_nomor}` : ''}
                </p>
              </div>
              <div className="mt-5 space-y-2">
                {berikutnya.status === 'diproses' && (
                  <button
                    onClick={() => handleUpdateStatus(berikutnya.id, 'selesai')}
                    disabled={updatingId === berikutnya.id}
                    className="w-full rounded-full bg-[#12123a] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
                  >
                    {updatingId === berikutnya.id ? '...' : 'Tandai Selesai'}
                  </button>
                )}
                {berikutnya.status === 'dijadwalkan' && (
                  <button
                    onClick={() => handleUpdateStatus(berikutnya.id, 'diproses')}
                    disabled={updatingId === berikutnya.id}
                    className="w-full rounded-full bg-[#12123a] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
                  >
                    {updatingId === berikutnya.id ? '...' : 'Mulai Servis'}
                  </button>
                )}
                <Link
                  to={`/mekanik/pekerjaan/${berikutnya.id}`}
                  className="block rounded-full border border-[#12123a] py-3 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-50"
                >
                  Lihat Detail
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-5 flex-1 text-sm text-slate-400">Belum ada pekerjaan yang ditugaskan.</p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Riwayat Terakhir</h2>
            <Link to="/mekanik/riwayat" className="text-xs font-semibold text-[#12123a] hover:underline">Semua</Link>
          </div>
          {riwayat.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">Belum ada riwayat pekerjaan.</p>
          ) : (
            <ul className="space-y-4">
              {riwayat.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
                    <IconFor name={r.layanan?.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.layanan?.nama ?? '-'}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Baris 3: antrian, progres, waktu */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Antrian Pekerjaan</h2>
            <Link
              to="/mekanik/pekerjaan"
              className="rounded-full border border-[#12123a] px-4 py-1.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
            >
              Lihat Semua
            </Link>
          </div>
          {antrian.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada pekerjaan yang ditugaskan.</p>
          ) : (
            <ul className="space-y-3">
              {antrian.map((job) => (
                <li key={job.id} className="flex items-center gap-3">
                  <Avatar nama={job.customer?.full_name} url={job.customer?.avatar_url} className="h-11 w-11 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {job.layanan?.nama ?? '-'}
                      <span className="font-normal text-slate-400"> · {job.customer?.full_name ?? '-'}</span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[job.kendaraan?.merek, job.kendaraan?.model].filter(Boolean).join(' ')} {job.kendaraan?.plat_nomor}
                      {' · '}
                      {formatTanggal(job.tanggal)}
                      {job.waktu ? `, ${job.waktu.slice(0, 5)}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_CLASS[job.status]}`}>
                    {STATUS_LABEL[job.status]}
                  </span>
                  <Link
                    to={`/mekanik/pekerjaan/${job.id}`}
                    className="hidden rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:block"
                  >
                    Detail
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="mb-2 text-[15px] font-semibold text-slate-900">Progres Pekerjaan</h2>
          <Gauge
            selesai={statusCounts.selesai || 0}
            diproses={statusCounts.diproses || 0}
            pending={statusCounts.dijadwalkan || 0}
            caption="Pekerjaan selesai"
          />
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-6 text-white">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[22px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-[14px] border-white/5" />
          <p className="relative text-[15px] font-medium">Rata-rata Waktu Servis</p>
          <div className="relative my-6">
            <p className="text-5xl font-bold tracking-tight">{formatDurasi(rataRataMenit)}</p>
            <p className="mt-1 text-xs text-white/60">
              {rataRataMenit > 0 ? 'dari servis selesai bulan ini' : 'Belum ada log Dikerjakan ke Selesai bulan ini'}
            </p>
          </div>
          <Link
            to="/mekanik/riwayat"
            className="relative rounded-full bg-white py-3.5 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-100"
          >
            Lihat Riwayat
          </Link>
        </div>
      </div>
    </div>
  )
}