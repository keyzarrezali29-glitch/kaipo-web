import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Wrench, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles,
  ClipboardList, CheckCircle2, TrendingUp, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ICON_MAP = {
  wrench: Wrench,
  engine: Settings2,
  bolt: Zap,
  wheel: Disc3,
  oil: Droplet,
  car: Car,
  aircon: Wind,
  sparkles: Sparkles,
}
function IconFor({ name, size = 20 }) {
  const Comp = ICON_MAP[name] || Wrench
  return <Comp size={size} />
}

function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}
const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-amber-50 text-amber-700 ring-amber-100',
  dijadwalkan: 'bg-amber-50 text-amber-700 ring-amber-100',
  diproses: 'bg-blue-50 text-blue-700 ring-blue-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dibatalkan: 'bg-rose-50 text-rose-700 ring-rose-100',
}

export default function DetailLayanan() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [layanan, setLayanan] = useState(null)
  const [bookingList, setBookingList] = useState([])
  const [pendapatan, setPendapatan] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const [layananRes, bookingRes] = await Promise.all([
          supabase.from('layanan').select('*').eq('id', id).single(),
          supabase
            .from('booking')
            .select(`
              id, kode_booking, tanggal, status, biaya_estimasi, biaya_final,
              customer:customer_id ( full_name )
            `)
            .eq('layanan_id', id)
            .order('tanggal', { ascending: false }),
        ])

        if (layananRes.error) throw layananRes.error
        if (bookingRes.error) throw bookingRes.error

        setLayanan(layananRes.data)
        const bookings = bookingRes.data ?? []
        setBookingList(bookings)

        // Hitung total pendapatan dari transaksi berhasil yang terhubung ke booking-booking ini
        const bookingIds = bookings.map((b) => b.id)
        if (bookingIds.length > 0) {
          const { data: transaksiData, error: transaksiError } = await supabase
            .from('transaksi')
            .select('total, booking_id')
            .in('booking_id', bookingIds)
            .eq('status', 'berhasil')
          if (transaksiError) throw transaksiError
          const total = (transaksiData ?? []).reduce((sum, t) => sum + Number(t.total || 0), 0)
          setPendapatan(total)
        }
      } catch (err) {
        console.error('Gagal memuat detail layanan:', err)
        setError(err.message || 'Layanan tidak ditemukan')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const stats = useMemo(() => {
    const total = bookingList.length
    const selesai = bookingList.filter((b) => b.status === 'selesai').length
    const dibatalkan = bookingList.filter((b) => b.status === 'dibatalkan').length
    return { total, selesai, dibatalkan }
  }, [bookingList])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail layanan...</div>
  }

  if (error || !layanan) {
    return (
      <div className="min-h-full">
        <Link to="/admin/servis" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="rounded-3xl bg-white p-10 text-center text-sm text-rose-500">
          {error ?? 'Layanan tidak ditemukan.'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <Link to="/admin/servis" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali ke Data Servis
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <IconFor name={layanan.icon} size={24} />
          </span>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{layanan.nama}</h1>
              <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${layanan.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                {layanan.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="mb-2 text-sm text-slate-400">{layanan.deskripsi || 'Belum ada deskripsi.'}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {layanan.kategori && <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{layanan.kategori}</span>}
              <span>Estimasi: {layanan.estimasi_waktu || '-'}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Harga</p>
          <p className="text-2xl font-bold text-slate-900">{formatRupiah(layanan.harga)}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<ClipboardList size={18} />} label="Total Booking" value={stats.total} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Booking Selesai" value={stats.selesai} accent="emerald" />
        <StatCard icon={<Clock size={18} />} label="Dibatalkan" value={stats.dibatalkan} accent="rose" />
        <StatCard icon={<TrendingUp size={18} />} label="Total Pendapatan" value={formatRupiah(pendapatan)} isText />
      </div>

      {/* Daftar booking */}
      <div className="rounded-3xl bg-white p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Riwayat Booking untuk Layanan Ini</h2>
        {bookingList.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Belum ada booking yang menggunakan layanan ini.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {bookingList.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{b.customer?.full_name ?? '-'}</p>
                  <p className="text-xs text-slate-400">{b.kode_booking} · {formatTanggal(b.tanggal)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    {formatRupiah(b.biaya_final ?? b.biaya_estimasi)}
                  </span>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_CLASS[b.status]}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, isText, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-500',
  }
  return (
    <div className="rounded-3xl bg-white p-6">
      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>{icon}</span>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 font-bold text-slate-900 ${isText ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  )
}