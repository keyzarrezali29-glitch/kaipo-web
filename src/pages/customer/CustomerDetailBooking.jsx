import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Wrench, Car, MapPin, StickyNote, User, CheckCircle2, Circle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import TombolBayar from '../../components/TombolBayar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function formatWaktuSingkat(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' • ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
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

// Urutan progres normal (dipakai buat nentuin timeline mana yang udah lewat)
const URUTAN_STATUS = ['menunggu_konfirmasi', 'dijadwalkan', 'diproses', 'selesai']

const TRANSAKSI_STATUS_LABEL = {
  menunggu: 'Menunggu Pembayaran',
  berhasil: 'Berhasil',
  gagal: 'Gagal',
  refund: 'Refund',
}
const TRANSAKSI_STATUS_CLASS = {
  menunggu: 'bg-amber-100 text-amber-700',
  berhasil: 'bg-emerald-100 text-emerald-700',
  gagal: 'bg-rose-100 text-rose-700',
  refund: 'bg-slate-100 text-slate-600',
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function CustomerDetailBooking() {
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [logStatus, setLogStatus] = useState([])
  const [transaksiList, setTransaksiList] = useState([])

  async function load() {
    try {
      setError(null)
      const [bookingRes, logRes, transaksiRes] = await Promise.all([
        supabase
          .from('booking')
          .select(`
            id, kode_booking, tanggal, waktu, status, lokasi, catatan, biaya_estimasi, biaya_final,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama, harga, deskripsi ),
            mekanik:mekanik_id ( full_name )
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('booking_status_log')
          .select('*')
          .eq('booking_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('transaksi')
          .select('*')
          .eq('booking_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (bookingRes.error) throw bookingRes.error
      setBooking(bookingRes.data)
      setLogStatus(logRes.data ?? [])
      setTransaksiList(transaksiRes.data ?? [])
    } catch (err) {
      console.error('Gagal memuat detail booking:', err)
      setError(err.message || 'Booking tidak ditemukan')
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail booking...</div>
  }

  if (error || !booking) {
    return (
      <div className="min-h-full bg-slate-100 px-8 py-6">
        <Link to="/customer/booking" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-rose-500 shadow-sm">
          {error ?? 'Booking tidak ditemukan.'}
        </div>
      </div>
    )
  }

  const sudahLunas = transaksiList.some((t) => t.status === 'berhasil')
  const transaksiAktif = transaksiList[0] // yang paling baru
  const bisaBayar = booking.status !== 'dibatalkan' && !sudahLunas

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <Link to="/customer/booking" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali ke Booking
      </Link>

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">Kode Booking</p>
          <h1 className="text-2xl font-bold text-slate-900">{booking.kode_booking}</h1>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_CLASS[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Info Booking */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Detail Servis</h2>
            <div className="space-y-4">
              <InfoRow icon={<Wrench size={16} />} label="Layanan" value={booking.layanan?.nama ?? '-'} sub={booking.layanan?.deskripsi} />
              <InfoRow
                icon={<Car size={16} />}
                label="Kendaraan"
                value={[booking.kendaraan?.merek, booking.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                sub={booking.kendaraan?.plat_nomor}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label="Jadwal & Lokasi"
                value={`${formatTanggal(booking.tanggal)} • ${booking.waktu?.slice(0, 5)} WIB`}
                sub={booking.lokasi ?? 'Kai-Po Elite Garage'}
              />
              {booking.mekanik?.full_name && (
                <InfoRow icon={<User size={16} />} label="Mekanik" value={booking.mekanik.full_name} />
              )}
              {booking.catatan && (
                <InfoRow icon={<StickyNote size={16} />} label="Catatan" value={booking.catatan} />
              )}
            </div>
          </div>

          {/* Timeline Status */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Riwayat Status</h2>
            {logStatus.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada perubahan status.</p>
            ) : (
              <ol className="space-y-0">
                {logStatus.map((log, i) => {
                  const isLast = i === logStatus.length - 1
                  const isDibatalkan = log.status === 'dibatalkan'
                  return (
                    <li key={log.id} className="relative flex gap-3 pb-6 last:pb-0">
                      {!isLast && <span className="absolute left-[9px] top-5 h-full w-px bg-slate-100" />}
                      <span className="mt-0.5 shrink-0">
                        {isDibatalkan ? (
                          <XCircle size={19} className="text-rose-500" />
                        ) : isLast ? (
                          <CheckCircle2 size={19} className="text-indigo-600" />
                        ) : (
                          <Circle size={19} className="text-slate-300" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{STATUS_LABEL[log.status] ?? log.status}</p>
                        {log.catatan && <p className="text-xs text-slate-400">{log.catatan}</p>}
                        <p className="text-xs text-slate-400">{formatWaktuSingkat(log.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar: Pembayaran */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Pembayaran</h3>

            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm text-slate-400">
                {booking.biaya_final ? 'Total Biaya' : 'Estimasi Biaya'}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatRupiah(booking.biaya_final ?? booking.biaya_estimasi ?? booking.layanan?.harga)}
              </span>
            </div>

            {sudahLunas ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Sudah Dibayar
              </div>
            ) : bisaBayar ? (
              <TombolBayar
                bookingId={booking.id}
                onSukses={load}
                className="block w-full rounded-xl bg-amber-500 py-3 text-center text-sm font-semibold text-[#12123a] hover:bg-amber-400 disabled:opacity-60"
              >
                Bayar Sekarang
              </TombolBayar>
            ) : (
              <p className="text-center text-sm text-slate-400">Booking ini sudah dibatalkan.</p>
            )}

            {/* Riwayat percobaan transaksi, kalau ada lebih dari 1 (misal sempat gagal/expired lalu coba lagi) */}
            {transaksiList.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold text-slate-500">Riwayat Transaksi</p>
                {transaksiList.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t.kode_transaksi}</span>
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${TRANSAKSI_STATUS_CLASS[t.status]}`}>
                      {TRANSAKSI_STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}