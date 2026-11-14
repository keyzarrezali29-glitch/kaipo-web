import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Wrench, Car, MapPin, StickyNote, Phone, Mail,
  CheckCircle2, Circle, XCircle, Tag, AlertCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import SparepartServis from '../../components/SparepartServis'

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
function bukaWhatsApp(phone) {
  let nomor = String(phone || '').replace(/\D/g, '')
  if (!nomor) return
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
  window.open(`https://wa.me/${nomor}`, '_blank', 'noopener,noreferrer')
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}
const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-blue-50 text-blue-700 ring-blue-100',
  dijadwalkan: 'bg-amber-50 text-amber-700 ring-amber-100',
  diproses: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dibatalkan: 'bg-rose-50 text-rose-700 ring-rose-100',
}
const TRANSAKSI_LABEL = {
  menunggu: 'Menunggu Pembayaran',
  berhasil: 'Berhasil',
  gagal: 'Gagal',
  refund: 'Refund',
}
const TRANSAKSI_CLASS = {
  menunggu: 'bg-amber-50 text-amber-700 ring-amber-100',
  berhasil: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  gagal: 'bg-rose-50 text-rose-700 ring-rose-100',
  refund: 'bg-slate-50 text-slate-600 ring-slate-100',
}

const REGEX_PROMO = /\[Kode Promo:[^\]]*\]/

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DetailBookingAdmin() {
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [logStatus, setLogStatus] = useState([])
  const [transaksiList, setTransaksiList] = useState([])

  const [biayaInput, setBiayaInput] = useState('')
  const [savingBiaya, setSavingBiaya] = useState(false)
  const [noticeBiaya, setNoticeBiaya] = useState({ type: '', message: '' })
  const [membatalkan, setMembatalkan] = useState(false)

  async function load() {
    try {
      setError(null)
      const [bookingRes, logRes, transaksiRes] = await Promise.all([
        supabase
          .from('booking')
          .select(`
            id, kode_booking, tanggal, waktu, status, lokasi, catatan, biaya_estimasi, biaya_final,
            customer:customer_id ( full_name, email, phone, avatar_url ),
            kendaraan:kendaraan_id ( merek, model, plat_nomor, warna, tahun ),
            layanan:layanan_id ( nama, harga, deskripsi ),
            mekanik:mekanik_id ( full_name, phone, avatar_url )
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
      const b = bookingRes.data
      setBooking(b)
      setLogStatus(logRes.data ?? [])
      setTransaksiList(transaksiRes.data ?? [])
      setBiayaInput(String(b.biaya_final ?? b.biaya_estimasi ?? b.layanan?.harga ?? ''))
    } catch (err) {
      console.error('Gagal memuat detail booking:', err)
      setError(err.message || 'Booking tidak ditemukan')
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  async function simpanBiaya() {
    setNoticeBiaya({ type: '', message: '' })
    const angka = Number(biayaInput)
    if (biayaInput === '' || Number.isNaN(angka) || angka < 0) {
      setNoticeBiaya({ type: 'error', message: 'Isi biaya dengan angka yang valid.' })
      return
    }
    setSavingBiaya(true)
    try {
      const { error: updateError } = await supabase.from('booking').update({ biaya_final: angka }).eq('id', id)
      if (updateError) throw updateError
      await load()
      setNoticeBiaya({ type: 'success', message: 'Biaya final tersimpan. Customer sekarang melihat biaya ini.' })
    } catch (err) {
      console.error('Gagal simpan biaya:', err)
      setNoticeBiaya({ type: 'error', message: err.message || 'Gagal menyimpan biaya.' })
    } finally {
      setSavingBiaya(false)
    }
  }

  async function batalkanBooking() {
    const dibayar = transaksiList
      .filter((t) => t.status === 'berhasil')
      .reduce((sum, t) => sum + Number(t.total || 0), 0)
    const pesanKonfirmasi =
      dibayar > 0
        ? `Booking ${booking.kode_booking} sudah dibayar ${formatRupiah(dibayar)}. Jika dibatalkan, pembayaran ditandai REFUND dan dana harus dikembalikan ke customer. Lanjutkan?`
        : `Batalkan booking ${booking.kode_booking}? Customer akan diberi tahu lewat notifikasi.`
    if (!window.confirm(pesanKonfirmasi)) return
    setMembatalkan(true)
    try {
      const { error: updateError } = await supabase.from('booking').update({ status: 'dibatalkan' }).eq('id', id)
      if (updateError) throw updateError
      await load()
    } catch (err) {
      console.error('Gagal membatalkan booking:', err)
      alert('Gagal membatalkan booking: ' + err.message)
    } finally {
      setMembatalkan(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail booking...</div>
  }

  if (error || !booking) {
    return (
      <div className="min-h-full">
        <Link to="/admin/booking" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="rounded-3xl bg-white p-12 text-center text-sm text-rose-500">
          {error ?? 'Booking tidak ditemukan.'}
        </div>
      </div>
    )
  }

  const promoMatch = booking.catatan?.match(REGEX_PROMO)
  const catatanBersih = booking.catatan?.replace(REGEX_PROMO, '').trim()
  const sudahLunas = transaksiList.some((t) => t.status === 'berhasil')
  const bisaBatal = booking.status === 'dijadwalkan' || booking.status === 'menunggu_konfirmasi'
  const adaRefund = transaksiList.some((t) => t.status === 'refund')
  const biayaTampil = booking.biaya_final ?? booking.biaya_estimasi ?? booking.layanan?.harga
  const biayaSudahFinal = booking.biaya_final !== null && booking.biaya_final !== undefined

  return (
    <div className="min-h-full">
      <Link to="/admin/booking" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali ke Booking Servis
      </Link>

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">Kode Booking</p>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-900">{booking.kode_booking}</h1>
        </div>
        <span className={`rounded-md px-3.5 py-1.5 text-xs font-semibold ring-1 ring-inset ${STATUS_CLASS[booking.status] || 'bg-slate-50 text-slate-600 ring-slate-100'}`}>
          {STATUS_LABEL[booking.status] || booking.status}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom kiri */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-3xl bg-white p-6">
            <h2 className="mb-5 text-[15px] font-semibold text-slate-900">Detail Servis</h2>

            {promoMatch && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-amber-600">
                  <Tag size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Customer memakai kode promo</p>
                  <p className="mt-0.5 font-mono text-xs text-amber-700">{promoMatch[0]}</p>
                  <p className="mt-1 text-xs text-amber-600">
                    Terapkan diskonnya saat mengisi biaya final di sebelah kanan.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <InfoRow icon={<Wrench size={16} />} label="Layanan" value={booking.layanan?.nama ?? '-'} sub={booking.layanan?.deskripsi} />
              <InfoRow
                icon={<Car size={16} />}
                label="Kendaraan"
                value={[booking.kendaraan?.merek, booking.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                sub={[booking.kendaraan?.plat_nomor, booking.kendaraan?.tahun, booking.kendaraan?.warna].filter(Boolean).join(' · ')}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label="Jadwal & Lokasi"
                value={`${formatTanggal(booking.tanggal)} • ${booking.waktu?.slice(0, 5)} WIB`}
                sub={booking.lokasi ?? 'Kai-Po Elite Garage'}
              />
              {booking.mekanik?.full_name && (
                <InfoRow
                  bare
                  icon={<Avatar nama={booking.mekanik.full_name} url={booking.mekanik.avatar_url} className="h-10 w-10 text-sm" />}
                  label="Mekanik"
                  value={booking.mekanik.full_name}
                />
              )}
              {catatanBersih && (
                <InfoRow icon={<StickyNote size={16} />} label="Catatan customer" value={catatanBersih} />
              )}
            </div>
          </div>

          {/* Sparepart yang dicatat mekanik (hanya lihat) */}
          {(booking.status === 'diproses' || booking.status === 'selesai') && (
            <SparepartServis bookingId={booking.id} status={booking.status} readOnly />
          )}

          {/* Timeline */}
          <div className="rounded-3xl bg-white p-6">
            <h2 className="mb-5 text-[15px] font-semibold text-slate-900">Riwayat Status</h2>
            {logStatus.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada perubahan status.</p>
            ) : (
              <ol>
                {logStatus.map((log, i) => {
                  const isLast = i === logStatus.length - 1
                  const dibatalkan = log.status === 'dibatalkan'
                  return (
                    <li key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {!isLast && <span className="absolute left-[10px] top-6 h-full w-px bg-slate-200" />}
                      <span className="mt-0.5 shrink-0 bg-white">
                        {dibatalkan ? (
                          <XCircle size={21} className="text-rose-500" />
                        ) : isLast ? (
                          <CheckCircle2 size={21} className="text-[#12123a]" />
                        ) : (
                          <Circle size={21} className="text-slate-300" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{STATUS_LABEL[log.status] ?? log.status}</p>
                        {log.catatan && <p className="text-xs text-slate-500">{log.catatan}</p>}
                        <p className="text-xs text-slate-400">{formatWaktuSingkat(log.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Kolom kanan */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          {/* Customer */}
          <div className="rounded-3xl bg-white p-6">
            <h3 className="mb-4 text-[15px] font-semibold text-slate-900">Customer</h3>
            <div className="flex items-center gap-3.5">
              <Avatar nama={booking.customer?.full_name} url={booking.customer?.avatar_url} className="h-12 w-12 text-base" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{booking.customer?.full_name ?? '-'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
                  <Mail size={12} className="shrink-0" /> {booking.customer?.email ?? '-'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone size={12} className="shrink-0" /> {booking.customer?.phone || 'Belum diisi'}
                </p>
              </div>
            </div>
            {booking.customer?.phone && (
              <button
                onClick={() => bukaWhatsApp(booking.customer.phone)}
                className="mt-4 w-full rounded-full border border-[#12123a] py-2.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
              >
                Hubungi via WhatsApp
              </button>
            )}
          </div>

          {/* Pembayaran */}
          <div className="rounded-3xl bg-white p-6">
            <h3 className="mb-4 text-[15px] font-semibold text-slate-900">Pembayaran</h3>

            <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-5 text-white">
              <div className="pointer-events-none absolute -bottom-10 -right-10 h-32 w-32 rounded-full border-[14px] border-white/5" />
              <p className="relative text-xs text-white/60">{biayaSudahFinal ? 'Biaya final' : 'Estimasi biaya'}</p>
              <p className="relative mt-1 text-2xl font-bold tracking-tight">{formatRupiah(biayaTampil)}</p>
            </div>

            {booking.status === 'menunggu_konfirmasi' && !sudahLunas && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>Customer belum membayar. Booking belum bisa dikonfirmasi dan ditugaskan ke mekanik.</span>
              </div>
            )}

            {booking.status !== 'dibatalkan' && !sudahLunas && (
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Atur biaya final (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={biayaInput}
                  onChange={(e) => setBiayaInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
                  placeholder="250000"
                />
                {noticeBiaya.message && (
                  <p
                    className={`mt-2 flex items-start gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium ${
                      noticeBiaya.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {noticeBiaya.type === 'error' ? (
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                    )}
                    {noticeBiaya.message}
                  </p>
                )}
                <button
                  onClick={simpanBiaya}
                  disabled={savingBiaya}
                  className="mt-3 w-full rounded-full bg-[#12123a] py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
                >
                  {savingBiaya ? 'Menyimpan...' : 'Simpan Biaya'}
                </button>
              </div>
            )}

            {sudahLunas && (
              <div className="mb-4 flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                <CheckCircle2 size={16} /> Sudah Dibayar
              </div>
            )}

            {booking.status === 'dibatalkan' && adaRefund && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-100">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>Booking dibatalkan. Pembayaran ditandai Refund dan perlu dikembalikan ke customer.</span>
              </div>
            )}

            {transaksiList.length > 0 ? (
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500">Riwayat Transaksi</p>
                {transaksiList.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-mono text-slate-400">{t.kode_transaksi}</span>
                    <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TRANSAKSI_CLASS[t.status] || 'bg-slate-50 text-slate-600 ring-slate-100'}`}>
                      {TRANSAKSI_LABEL[t.status] ?? t.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">Belum ada transaksi pembayaran.</p>
            )}
          </div>

          {/* Batalkan */}
          {bisaBatal && (
            <button
              onClick={batalkanBooking}
              disabled={membatalkan}
              className="w-full rounded-full border border-rose-200 bg-white py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {membatalkan ? 'Membatalkan...' : 'Batalkan Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, sub, bare = false }) {
  return (
    <div className="flex items-start gap-4">
      {bare ? (
        icon
      ) : (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
          {icon}
        </span>
      )}
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="whitespace-pre-line text-sm font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}