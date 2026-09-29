import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Tag, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

function iconUntukStatus(status) {
  if (status === 'selesai') return <CheckCircle2 size={17} />
  if (status === 'dibatalkan') return <XCircle size={17} />
  return <Clock size={17} />
}

function formatWaktu(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const sekarang = new Date()
  const diffJam = Math.floor((sekarang - d) / (1000 * 60 * 60))

  if (diffJam < 1) return 'Baru saja'
  if (diffJam < 24) return `${diffJam} jam lalu`
  const diffHari = Math.floor(diffJam / 24)
  if (diffHari < 7) return `${diffHari} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerPesan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifikasi, setNotifikasi] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Belum login')

        const todayStr = new Date().toISOString().slice(0, 10)

        const [logRes, promoRes] = await Promise.all([
          supabase
            .from('booking_status_log')
            .select(`
              id, status, catatan, created_at,
              booking:booking_id ( id, kode_booking, customer_id, layanan:layanan_id ( nama ) )
            `)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('promo')
            .select('id, judul, deskripsi, created_at')
            .eq('is_active', true)
            .gte('berlaku_sampai', todayStr)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        if (logRes.error) throw logRes.error
        if (promoRes.error) throw promoRes.error

        // Filter log status: cuma yang booking-nya emang punya customer ini
        const logNotif = (logRes.data ?? [])
          .filter((log) => log.booking?.customer_id === user.id)
          .map((log) => ({
            id: `log-${log.id}`,
            tipe: 'booking',
            judul: `Booking ${log.booking?.kode_booking ?? ''} — ${STATUS_LABEL[log.status] ?? log.status}`,
            deskripsi: log.catatan || `${log.booking?.layanan?.nama ?? 'Servis'} sekarang berstatus "${STATUS_LABEL[log.status] ?? log.status}"`,
            waktu: log.created_at,
            status: log.status,
            link: log.booking?.id ? `/customer/booking/${log.booking.id}` : null,
          }))

        const promoNotif = (promoRes.data ?? []).map((p) => ({
          id: `promo-${p.id}`,
          tipe: 'promo',
          judul: `Promo Baru: ${p.judul}`,
          deskripsi: p.deskripsi || 'Cek detail promo dan syaratnya.',
          waktu: p.created_at,
          link: '/customer/promo',
        }))

        const gabungan = [...logNotif, ...promoNotif].sort(
          (a, b) => new Date(b.waktu) - new Date(a.waktu)
        )
        setNotifikasi(gabungan)
      } catch (err) {
        console.error('Gagal memuat notifikasi:', err)
        setError(err.message || 'Gagal memuat notifikasi')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat notifikasi...</div>
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pesan</h1>
          <p className="mt-1 text-sm text-slate-400">Update terbaru seputar booking dan promo Anda</p>
        </div>
        {notifikasi.length > 0 && (
          <span className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#12123a]">
            {notifikasi.length} pembaruan
          </span>
        )}
      </header>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      {notifikasi.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Bell size={24} />
          </span>
          <p className="text-sm text-slate-400">Belum ada notifikasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifikasi.map((n) => {
            const isi = (
              <div className="flex items-start gap-4 rounded-3xl bg-white p-5 transition hover:shadow-md">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    n.tipe === 'promo' ? 'bg-[#12123a] text-white' : 'bg-slate-100 text-[#12123a]'
                  }`}
                >
                  {n.tipe === 'promo' ? <Tag size={17} /> : iconUntukStatus(n.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{n.judul}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{formatWaktu(n.waktu)}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{n.deskripsi}</p>
                </div>
              </div>
            )
            return n.link ? (
              <Link key={n.id} to={n.link} className="block">
                {isi}
              </Link>
            ) : (
              <div key={n.id}>{isi}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}