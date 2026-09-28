import { useEffect, useState } from 'react'
import { RefreshCw, Users, CalendarClock, Wallet, UserCheck, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function formatRupiahSingkat(angka) {
  if (!angka) return 'Rp 0'
  if (angka >= 1_000_000_000) return `Rp ${(angka / 1_000_000_000).toFixed(1).replace('.', ',')}M`
  if (angka >= 1_000_000) return `Rp ${(angka / 1_000_000).toFixed(1).replace('.', ',')}jt`
  if (angka >= 1_000) return `Rp ${(angka / 1_000).toFixed(0)}rb`
  return `Rp ${angka}`
}

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-amber-100 text-amber-700',
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

function getMonthRangeISO(offset = 0) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1).toISOString()
  return { start, end }
}

function getTodayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardAdmin() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [totalCustomer, setTotalCustomer] = useState(0)
  const [customerBaruBulanIni, setCustomerBaruBulanIni] = useState(0)
  const [bookingHariIni, setBookingHariIni] = useState(0)
  const [pendapatanBulanIni, setPendapatanBulanIni] = useState(0)
  const [pendapatanGrowth, setPendapatanGrowth] = useState(null)
  const [mekanikAktif, setMekanikAktif] = useState({ aktif: 0, total: 0 })
  const [bookingTerbaru, setBookingTerbaru] = useState([])
  const [stokMenipis, setStokMenipis] = useState([])
  const [layananTerpopuler, setLayananTerpopuler] = useState([])

  async function loadDashboard() {
    try {
      setError(null)
      const todayStr = getTodayISO()
      const thisMonth = getMonthRangeISO(0)
      const lastMonth = getMonthRangeISO(-1)

      const [
        customerCountRes,
        customerBaruRes,
        bookingTodayCountRes,
        transaksiBulanIniRes,
        transaksiBulanLaluRes,
        mekanikDetailRes,
        bookingTerbaruRes,
        produkRes,
        bookingLayananRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', thisMonth.start),
        supabase.from('booking').select('id', { count: 'exact', head: true }).eq('tanggal', todayStr),
        supabase.from('transaksi').select('total').eq('status', 'berhasil').gte('created_at', thisMonth.start).lt('created_at', thisMonth.end),
        supabase.from('transaksi').select('total').eq('status', 'berhasil').gte('created_at', lastMonth.start).lt('created_at', lastMonth.end),
        supabase.from('mekanik_detail').select('status_kerja'),
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status,
            customer:customer_id ( full_name, avatar_url ),
            kendaraan:kendaraan_id ( merek, model ),
            layanan:layanan_id ( nama )
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('produk').select('nama, stok').order('stok', { ascending: true }).limit(3),
        supabase.from('booking').select('layanan:layanan_id ( nama )'),
      ])

      for (const res of [
        customerCountRes, customerBaruRes, bookingTodayCountRes, transaksiBulanIniRes,
        transaksiBulanLaluRes, mekanikDetailRes, bookingTerbaruRes, produkRes, bookingLayananRes,
      ]) {
        if (res.error) throw res.error
      }

      setTotalCustomer(customerCountRes.count ?? 0)
      setCustomerBaruBulanIni(customerBaruRes.count ?? 0)
      setBookingHariIni(bookingTodayCountRes.count ?? 0)

      const totalBulanIni = (transaksiBulanIniRes.data ?? []).reduce((sum, t) => sum + Number(t.total || 0), 0)
      const totalBulanLalu = (transaksiBulanLaluRes.data ?? []).reduce((sum, t) => sum + Number(t.total || 0), 0)
      setPendapatanBulanIni(totalBulanIni)
      setPendapatanGrowth(totalBulanLalu > 0 ? Math.round(((totalBulanIni - totalBulanLalu) / totalBulanLalu) * 100) : null)

      const mekanikRows = mekanikDetailRes.data ?? []
      setMekanikAktif({ aktif: mekanikRows.filter((m) => m.status_kerja !== 'libur').length, total: mekanikRows.length })

      setBookingTerbaru(bookingTerbaruRes.data ?? [])
      setStokMenipis(produkRes.data ?? [])

      const counts = new Map()
      for (const row of bookingLayananRes.data ?? []) {
        const nama = row.layanan?.nama
        if (!nama) continue
        counts.set(nama, (counts.get(nama) || 0) + 1)
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      const max = sorted.length ? sorted[0][1] : 1
      setLayananTerpopuler(sorted.map(([nama, jumlah]) => ({ nama, jumlah, persen: Math.round((jumlah / max) * 100) })))
    } catch (err) {
      console.error('Gagal memuat dashboard:', err)
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

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat dashboard...</div>
  }

  return (
    <div className="min-h-full px-2 py-2">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ringkasan operasional Kai-Po hari ini,{' '}
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:text-indigo-600 hover:ring-indigo-100"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-900 text-sm font-semibold text-white">
            A
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertTriangle size={16} /> Gagal memuat sebagian data: {error}
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users size={20} />}
          accent="indigo"
          label="Total Customer"
          value={totalCustomer.toLocaleString('id-ID')}
          trend={customerBaruBulanIni > 0 ? `+${customerBaruBulanIni}` : null}
        />
        <StatCard icon={<CalendarClock size={20} />} accent="amber" label="Booking Hari Ini" value={bookingHariIni} />
        <StatCard
          icon={<Wallet size={20} />}
          accent="emerald"
          label="Pendapatan Bulan Ini"
          value={formatRupiahSingkat(pendapatanBulanIni)}
          trend={pendapatanGrowth !== null ? `${pendapatanGrowth >= 0 ? '+' : ''}${pendapatanGrowth}%` : null}
        />
        <StatCard icon={<UserCheck size={20} />} accent="violet" label="Mekanik Aktif" value={`${mekanikAktif.aktif} / ${mekanikAktif.total}`} />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Booking Terbaru</h2>
            <a href="/admin/booking" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
              Lihat Semua <ArrowUpRight size={12} />
            </a>
          </div>

          {bookingTerbaru.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada booking.</p>
          ) : (
            <ul className="space-y-2.5">
              {bookingTerbaru.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nama={b.customer?.full_name} url={b.customer?.avatar_url} className="h-10 w-10 text-xs" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {b.layanan?.nama ?? '-'} — {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {b.customer?.full_name ?? '-'} • {formatTanggal(b.tanggal)}{b.waktu ? `, ${b.waktu.slice(0, 5)} WIB` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Stok Sparepart Menipis</h2>
              <a href="/admin/produk" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                Kelola <ArrowUpRight size={12} />
              </a>
            </div>
            {stokMenipis.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Stok aman.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {stokMenipis.map((p) => (
                  <li key={p.nama} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.nama}</p>
                      <p className="text-xs text-slate-400">Sisa {p.stok} unit</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">Rendah</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Layanan Terpopuler</h2>
            {layananTerpopuler.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada data booking.</p>
            ) : (
              <ul className="space-y-4">
                {layananTerpopuler.map((l) => (
                  <li key={l.nama}>
                    <div className="mb-1.5 flex justify-between text-sm text-slate-700">
                      <span>{l.nama}</span>
                      <span className="text-xs font-medium text-slate-400">{l.jumlah}x</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${l.persen}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, trend, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>{icon}</span>
        {trend && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${trend.startsWith('-') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}