import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, ArrowUpRight, AlertTriangle } from 'lucide-react'
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

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDays() {
  const now = new Date()
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  return labels.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { key: toISO(d), label, isToday: toISO(d) === toISO(now) }
  })
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-amber-50 text-amber-700 ring-amber-100',
  dijadwalkan: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  diproses: 'bg-blue-50 text-blue-700 ring-blue-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dibatalkan: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const MEKANIK_STATUS = {
  tersedia: { label: 'Tersedia', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  bertugas: { label: 'Bertugas', className: 'bg-indigo-50 text-indigo-700 ring-indigo-100' },
  libur: { label: 'Libur', className: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

const HATCH = 'repeating-linear-gradient(135deg, #cbd5e1 0px, #cbd5e1 2px, #f1f5f9 2px, #f1f5f9 8px)'
const ARC = 'M 20 100 A 80 80 0 0 1 180 100'

const DATA_AWAL = {
  totalCustomer: 0,
  customerBaru: 0,
  bookingHariIni: 0,
  pendapatan: 0,
  growth: null,
  mekanikAktif: { aktif: 0, total: 0 },
  mekanikList: [],
  terbaru: [],
  stok: [],
  layanan: [],
  statusCounts: {},
  mingguan: [],
  berikutnya: null,
}

// ------------------------------------------------------------
// Charts
// ------------------------------------------------------------
function WeeklyChart({ data }) {
  const max = Math.max(...data.map((d) => d.jumlah), 1)

  return (
    <div className="flex h-52 items-end justify-between gap-2 sm:gap-4">
      {data.map((d) => {
        const ada = d.jumlah > 0
        const tinggi = ada ? 56 + (d.jumlah / max) * 88 : 56
        const tertinggi = ada && d.jumlah === max
        const gaya = ada
          ? { height: tinggi, backgroundColor: tertinggi ? '#12123a' : '#818cf8' }
          : { height: tinggi, backgroundImage: HATCH }

        return (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full max-w-[56px] rounded-full" style={gaya}>
              {ada && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {d.jumlah}
                </span>
              )}
            </div>
            <span className={`text-xs ${d.isToday ? 'font-bold text-[#12123a]' : 'text-slate-400'}`}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function Gauge({ selesai, diproses, pending }) {
  const total = selesai + diproses + pending
  const L = Math.PI * 80
  const persen = total > 0 ? Math.round((selesai / total) * 100) : 0
  const segments = [
    { v: selesai, stroke: '#12123a' },
    { v: diproses, stroke: '#4f46e5' },
    { v: pending, stroke: 'url(#hatch-gauge)' },
  ]
  let offset = 0

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 200 110" className="w-full">
        <defs>
          <pattern id="hatch-gauge" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#f1f5f9" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="2.5" />
          </pattern>
        </defs>
        <path d={ARC} fill="none" stroke="#f1f5f9" strokeWidth="26" />
        {total > 0 &&
          segments
            .filter((s) => s.v > 0)
            .map((s, i) => {
              const len = (s.v / total) * L
              const el = (
                <path
                  key={i}
                  d={ARC}
                  fill="none"
                  stroke={s.stroke}
                  strokeWidth="26"
                  strokeDasharray={`${len} ${L}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += len
              return el
            })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="text-4xl font-bold tracking-tight text-slate-900">{persen}%</p>
        <p className="text-xs text-slate-400">Booking selesai</p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardAdmin() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(DATA_AWAL)

  async function loadDashboard() {
    try {
      setError(null)
      const now = new Date()
      const todayStr = toISO(now)
      const awalBulanIni = new Date(now.getFullYear(), now.getMonth(), 1)
      const awalBulanLalu = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const minggu = getWeekDays()

      const [
        customerRes,
        customerBaruRes,
        todayRes,
        transaksiRes,
        mekanikCountRes,
        mekanikListRes,
        bookingAllRes,
        terbaruRes,
        produkRes,
        berikutnyaRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').gte('created_at', awalBulanIni.toISOString()),
        supabase.from('booking').select('id', { count: 'exact', head: true }).eq('tanggal', todayStr),
        supabase.from('transaksi').select('total, created_at').eq('status', 'berhasil').gte('created_at', awalBulanLalu.toISOString()),
        supabase.from('mekanik_detail').select('status_kerja'),
        supabase
          .from('mekanik_detail')
          .select('id, spesialisasi, status_kerja, profile:profile_id ( full_name, avatar_url )')
          .order('created_at', { ascending: true })
          .limit(4),
        supabase.from('booking').select('status, tanggal, layanan:layanan_id ( nama )'),
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
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status,
            customer:customer_id ( full_name ),
            kendaraan:kendaraan_id ( merek, model ),
            layanan:layanan_id ( nama )
          `)
          .gte('tanggal', todayStr)
          .in('status', ['menunggu_konfirmasi', 'dijadwalkan', 'diproses'])
          .order('tanggal', { ascending: true })
          .order('waktu', { ascending: true })
          .limit(1),
      ])

      // Daftar mekanik dibuat tidak fatal: kalau join gagal, bagian lain tetap tampil
      for (const res of [
        customerRes, customerBaruRes, todayRes, transaksiRes, mekanikCountRes,
        bookingAllRes, terbaruRes, produkRes, berikutnyaRes,
      ]) {
        if (res.error) throw res.error
      }
      if (mekanikListRes.error) console.warn('Daftar mekanik gagal dimuat:', mekanikListRes.error.message)

      // Pendapatan bulan ini vs bulan lalu
      let bulanIni = 0
      let bulanLalu = 0
      for (const t of transaksiRes.data ?? []) {
        if (new Date(t.created_at) >= awalBulanIni) bulanIni += Number(t.total || 0)
        else bulanLalu += Number(t.total || 0)
      }

      const mekanikRows = mekanikCountRes.data ?? []

      // Status, booking per hari, dan layanan terpopuler dari satu query
      const statusCounts = {}
      const perHari = new Map()
      const layananMap = new Map()
      for (const row of bookingAllRes.data ?? []) {
        statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
        if (row.status !== 'dibatalkan' && row.tanggal) {
          perHari.set(row.tanggal, (perHari.get(row.tanggal) || 0) + 1)
        }
        const nama = row.layanan?.nama
        if (nama) layananMap.set(nama, (layananMap.get(nama) || 0) + 1)
      }

      const sorted = [...layananMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      const maxLayanan = sorted.length ? sorted[0][1] : 1

      setData({
        totalCustomer: customerRes.count ?? 0,
        customerBaru: customerBaruRes.count ?? 0,
        bookingHariIni: todayRes.count ?? 0,
        pendapatan: bulanIni,
        growth: bulanLalu > 0 ? Math.round(((bulanIni - bulanLalu) / bulanLalu) * 100) : null,
        mekanikAktif: {
          aktif: mekanikRows.filter((m) => m.status_kerja !== 'libur').length,
          total: mekanikRows.length,
        },
        mekanikList: mekanikListRes.error ? [] : mekanikListRes.data ?? [],
        terbaru: terbaruRes.data ?? [],
        stok: produkRes.data ?? [],
        layanan: sorted.map(([nama, jumlah]) => ({ nama, jumlah, persen: Math.round((jumlah / maxLayanan) * 100) })),
        statusCounts,
        mingguan: minggu.map((d) => ({ ...d, jumlah: perHari.get(d.key) || 0 })),
        berikutnya: berikutnyaRes.data?.[0] ?? null,
      })
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

  const {
    totalCustomer, customerBaru, bookingHariIni, pendapatan, growth, mekanikAktif, mekanikList,
    terbaru, stok, layanan, statusCounts, mingguan, berikutnya,
  } = data

  const selesai = statusCounts.selesai || 0
  const diproses = statusCounts.diproses || 0
  const pending = (statusCounts.menunggu_konfirmasi || 0) + (statusCounts.dijadwalkan || 0)
  const perluKonfirmasi = statusCounts.menunggu_konfirmasi || 0
  const totalMinggu = mingguan.reduce((sum, d) => sum + d.jumlah, 0)

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pantau operasional bengkel, {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
            to="/admin/booking"
            className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
          >
            Kelola Booking
          </Link>
          <Link
            to="/admin/laporan"
            className="rounded-full border border-[#12123a] px-6 py-3 text-sm font-semibold text-[#12123a] transition hover:bg-white"
          >
            Lihat Laporan
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
          title="Pendapatan Bulan Ini"
          value={formatRupiahSingkat(pendapatan)}
          href="/admin/transaksi"
          badge={growth !== null ? `${growth >= 0 ? '+' : ''}${growth}%` : null}
          note={growth !== null ? 'dari bulan lalu' : 'Belum ada data bulan lalu'}
        />
        <StatCard
          title="Total Customer"
          value={totalCustomer.toLocaleString('id-ID')}
          href="/admin/customer"
          badge={customerBaru > 0 ? `+${customerBaru}` : null}
          note={customerBaru > 0 ? 'customer baru bulan ini' : 'Belum ada customer baru'}
        />
        <StatCard
          title="Booking Hari Ini"
          value={bookingHariIni}
          href="/admin/booking"
          note={bookingHariIni > 0 ? 'jadwal servis hari ini' : 'Belum ada jadwal hari ini'}
        />
        <StatCard
          title="Mekanik Aktif"
          value={`${mekanikAktif.aktif} / ${mekanikAktif.total}`}
          href="/admin/mekanik"
          note="tidak sedang libur"
        />

        {/* Baris 2: analitik */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Booking Minggu Ini</h2>
              <p className="mt-0.5 text-xs text-slate-400">{totalMinggu} booking aktif, Senin sampai Minggu</p>
            </div>
          </div>
          <WeeklyChart data={mingguan} />
        </div>

        <div className="flex flex-col rounded-3xl bg-white p-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Booking Berikutnya</h2>
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
                </p>
              </div>
              <Link
                to="/admin/booking"
                className="mt-5 rounded-full bg-[#12123a] py-3.5 text-center text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
              >
                Lihat Booking
              </Link>
            </>
          ) : (
            <p className="mt-5 flex-1 text-sm text-slate-400">Belum ada booking mendatang.</p>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Layanan Terpopuler</h2>
            <Link to="/admin/servis" className="text-xs font-semibold text-[#12123a] hover:underline">Kelola</Link>
          </div>
          {layanan.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">Belum ada data booking.</p>
          ) : (
            <ul className="space-y-4">
              {layanan.map((l) => (
                <li key={l.nama}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-slate-800">{l.nama}</span>
                    <span className="text-xs text-slate-400">{l.jumlah} booking</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#12123a]" style={{ width: `${l.persen}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Baris 3: mekanik, progres, konfirmasi */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Tim Mekanik</h2>
            <Link
              to="/admin/mekanik"
              className="rounded-full border border-[#12123a] px-4 py-1.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
            >
              Kelola Mekanik
            </Link>
          </div>
          {mekanikList.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Belum ada data mekanik.</p>
          ) : (
            <ul className="space-y-3">
              {mekanikList.map((m) => {
                const status = MEKANIK_STATUS[m.status_kerja] || MEKANIK_STATUS.libur
                const spesialis = Array.isArray(m.spesialisasi) && m.spesialisasi.length > 0
                  ? m.spesialisasi.slice(0, 2).join(', ')
                  : 'Mekanik'
                return (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar nama={m.profile?.full_name} url={m.profile?.avatar_url} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.profile?.full_name ?? '-'}</p>
                      <p className="truncate text-xs text-slate-400">{spesialis}</p>
                    </div>
                    <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${status.className}`}>
                      {status.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <h2 className="mb-2 text-[15px] font-semibold text-slate-900">Progres Booking</h2>
          <Gauge selesai={selesai} diproses={diproses} pending={pending} />
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#12123a]" /> Selesai
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4f46e5]" /> Diproses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundImage: HATCH }} /> Menunggu
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-6 text-white">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[22px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-[14px] border-white/5" />
          <p className="relative text-[15px] font-medium">Perlu Dikonfirmasi</p>
          <div className="relative my-6">
            <p className="text-5xl font-bold tracking-tight">{perluKonfirmasi}</p>
            <p className="mt-1 text-xs text-white/60">booking menunggu konfirmasi</p>
          </div>
          <Link
            to="/admin/booking"
            className="relative rounded-full bg-white py-3.5 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-100"
          >
            Tinjau Booking
          </Link>
        </div>

        {/* Baris 4: tabel + stok */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Booking Terbaru</h2>
            <Link to="/admin/booking" className="flex items-center gap-1 text-xs font-semibold text-[#12123a] hover:underline">
              Lihat semua <ArrowUpRight size={13} />
            </Link>
          </div>

          {terbaru.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada booking.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Layanan</th>
                    <th className="pb-3 font-medium">Jadwal</th>
                    <th className="pb-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terbaru.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar nama={b.customer?.full_name} url={b.customer?.avatar_url} className="h-9 w-9 text-xs" />
                          <span className="font-medium text-slate-900">{b.customer?.full_name ?? '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-slate-800">{b.layanan?.nama ?? '-'}</p>
                        <p className="text-xs text-slate-400">
                          {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {formatTanggal(b.tanggal)}
                        {b.waktu ? `, ${b.waktu.slice(0, 5)}` : ''}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_CLASS[b.status] || 'bg-slate-50 text-slate-600 ring-slate-100'}`}>
                          {STATUS_LABEL[b.status] || b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Stok Menipis</h2>
            <Link to="/admin/produk" className="text-xs font-semibold text-[#12123a] hover:underline">Kelola</Link>
          </div>
          {stok.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">Stok aman.</p>
          ) : (
            <ul className="space-y-4">
              {stok.map((p) => {
                const kritis = p.stok <= 10
                const persen = Math.min((p.stok / 20) * 100, 100)
                return (
                  <li key={p.nama}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{p.nama}</span>
                      <span className={`text-xs font-semibold ${kritis ? 'text-rose-600' : 'text-amber-600'}`}>
                        {p.stok} unit
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${kritis ? 'bg-rose-500' : 'bg-amber-400'}`}
                        style={{ width: `${persen}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, note, badge, href, highlight = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 ${
        highlight ? 'bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-white/5" />}
      <div className="relative flex items-start justify-between">
        <p className={`text-[15px] font-medium ${highlight ? 'text-white' : 'text-slate-800'}`}>{title}</p>
        <Link
          to={href}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            highlight ? 'bg-white text-[#12123a] hover:bg-slate-100' : 'text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="relative mt-5 text-4xl font-bold tracking-tight">{value}</p>
      <div className={`relative mt-3 flex items-center gap-2 text-xs ${highlight ? 'text-white/60' : 'text-slate-400'}`}>
        {badge && (
          <span
            className={`rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset ${
              highlight ? 'text-white ring-white/30' : 'text-emerald-700 ring-emerald-200'
            }`}
          >
            {badge}
          </span>
        )}
        <span>{note}</span>
      </div>
    </div>
  )
}