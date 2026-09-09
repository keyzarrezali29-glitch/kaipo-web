import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, CalendarCheck, History, Car, Tag, Wrench } from 'lucide-react'
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
function formatTanggalSingkat(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

const AKTIF_STATUS = ['menunggu_konfirmasi', 'dijadwalkan', 'diproses']

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}
const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-blue-100 text-blue-700',
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardCustomer() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [nama, setNama] = useState('')

  const [bookingAktifCount, setBookingAktifCount] = useState(0)
  const [riwayatCount, setRiwayatCount] = useState(0)
  const [kendaraanCount, setKendaraanCount] = useState(0)
  const [promoAktifCount, setPromoAktifCount] = useState(0)

  const [bookingBerikutnya, setBookingBerikutnya] = useState(null)
  const [bookingLunasIds, setBookingLunasIds] = useState(new Set())
  const [riwayatTerakhir, setRiwayatTerakhir] = useState([])
  const [kendaraanUtama, setKendaraanUtama] = useState(null)
  const [promoUnggulan, setPromoUnggulan] = useState(null)

  async function loadDashboard() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const todayStr = new Date().toISOString().slice(0, 10)

      const [profileRes, bookingRes, kendaraanRes, promoRes, transaksiRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status, lokasi, biaya_estimasi, biaya_final,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama )
          `)
          .eq('customer_id', user.id)
          .order('tanggal', { ascending: false }),
        supabase.from('kendaraan').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
        supabase
          .from('promo')
          .select('*')
          .eq('is_active', true)
          .gte('berlaku_sampai', todayStr)
          .order('nilai', { ascending: false }),
        // Dipakai buat ngecek booking mana yang udah lunas, biar tombol "Bayar"
        // nggak muncul lagi kalau transaksinya udah berhasil
        supabase.from('transaksi').select('booking_id, status').eq('customer_id', user.id),
      ])

      if (profileRes.error) throw profileRes.error
      if (bookingRes.error) throw bookingRes.error
      if (kendaraanRes.error) throw kendaraanRes.error
      if (promoRes.error) throw promoRes.error
      if (transaksiRes.error) throw transaksiRes.error

      setNama(profileRes.data?.full_name ?? '')

      const bookingIdSudahLunas = new Set(
        (transaksiRes.data ?? []).filter((t) => t.status === 'berhasil').map((t) => t.booking_id)
      )
      setBookingLunasIds(bookingIdSudahLunas)

      const bookings = bookingRes.data ?? []
      const aktif = bookings
        .filter((b) => AKTIF_STATUS.includes(b.status))
        .sort((a, b) => `${a.tanggal}${a.waktu}`.localeCompare(`${b.tanggal}${b.waktu}`))
      setBookingAktifCount(aktif.length)
      setBookingBerikutnya(aktif[0] ?? null)

      const selesai = bookings.filter((b) => b.status === 'selesai')
      setRiwayatCount(selesai.length)
      setRiwayatTerakhir(selesai.slice(0, 3))

      const kendaraan = kendaraanRes.data ?? []
      setKendaraanCount(kendaraan.length)
      setKendaraanUtama(kendaraan.find((k) => k.is_default) ?? kendaraan[0] ?? null)

      const promo = promoRes.data ?? []
      setPromoAktifCount(promo.length)
      setPromoUnggulan(promo[0] ?? null)
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
    <div>
      {/* Topbar */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Selamat datang kembali{nama ? `, ${nama.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-sm text-slate-400">Kelola servis kendaraan Anda dengan mudah</p>
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
      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck size={16} />} iconBg="bg-blue-100" label="Booking Aktif" value={bookingAktifCount} link="/customer/booking" linkText="Lihat detail" />
        <StatCard icon={<History size={16} />} iconBg="bg-indigo-100" label="Riwayat Servis" value={riwayatCount} link="/customer/riwayat" linkText="Lihat riwayat" />
        <StatCard icon={<Car size={16} />} iconBg="bg-emerald-100" label="Kendaraan" value={kendaraanCount} link="/customer/kendaraan" linkText="Kelola kendaraan" />
        <StatCard icon={<Tag size={16} />} iconBg="bg-amber-100" label="Promo Aktif" value={promoAktifCount} link="/customer/promo" linkText="Lihat promo" />
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Booking berikutnya */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Booking Berikutnya</h2>
            <a href="/customer/booking" className="text-xs font-medium text-indigo-600 hover:underline">Lihat Semua</a>
          </div>

          {bookingBerikutnya ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Wrench size={16} />
                </span>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">{bookingBerikutnya.layanan?.nama ?? '-'}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[bookingBerikutnya.status]}`}>
                      {STATUS_LABEL[bookingBerikutnya.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatTanggalSingkat(bookingBerikutnya.tanggal)} • {bookingBerikutnya.waktu?.slice(0, 5)} WIB
                  </p>
                  <p className="text-xs text-slate-400">
                    {[bookingBerikutnya.kendaraan?.merek, bookingBerikutnya.kendaraan?.model].filter(Boolean).join(' ')} {bookingBerikutnya.kendaraan?.plat_nomor} • {bookingBerikutnya.lokasi ?? 'Kai-Po Elite Garage'}
                  </p>
                  {(bookingBerikutnya.biaya_final || bookingBerikutnya.biaya_estimasi) && (
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {formatRupiah(bookingBerikutnya.biaya_final ?? bookingBerikutnya.biaya_estimasi)}
                      {!bookingBerikutnya.biaya_final && ' (estimasi)'}
                    </p>
                  )}
                </div>
              </div>

              {bookingLunasIds.has(bookingBerikutnya.id) ? (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-semibold text-emerald-700">
                  ✓ Sudah Dibayar
                </div>
              ) : (
                <TombolBayar
                  bookingId={bookingBerikutnya.id}
                  onSukses={loadDashboard}
                  className="mt-3 block w-full rounded-lg bg-amber-500 py-3 text-center text-sm font-semibold text-[#12123a] hover:bg-amber-400 disabled:opacity-60"
                >
                  Bayar Sekarang
                </TombolBayar>
              )}

              <Link
                to={`/customer/booking/${bookingBerikutnya.id}`}
                className="mt-2 block rounded-lg border border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Lihat Detail Booking
              </Link>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <p className="mb-3 text-sm text-slate-400">Belum ada booking aktif.</p>
              <a href="/customer/booking" className="inline-block rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]">
                Booking Servis Sekarang
              </a>
            </div>
          )}
        </div>

        {/* Promo */}
        <div className="rounded-2xl bg-[#12123a] p-5 text-white shadow-sm">
          {promoUnggulan ? (
            <>
              <p className="mb-2 text-xs text-white/50">Promo Untuk Anda</p>
              <p className="mb-2 text-2xl font-extrabold text-amber-400">
                {promoUnggulan.judul}
                {promoUnggulan.tipe_diskon === 'persen' ? ` ${promoUnggulan.nilai}%` : ` ${formatRupiah(promoUnggulan.nilai)}`}
              </p>
              <p className="mb-4 text-xs text-white/50">
                Berlaku hingga {formatTanggalSingkat(promoUnggulan.berlaku_sampai)}
                {promoUnggulan.min_transaksi ? ` · min. transaksi ${formatRupiah(promoUnggulan.min_transaksi)}` : ''}
              </p>
              <a href="/customer/promo" className="text-xs font-semibold text-white hover:underline">Lihat Promo →</a>
            </>
          ) : (
            <p className="text-sm text-white/50">Belum ada promo aktif saat ini.</p>
          )}
        </div>

        {/* Riwayat servis terakhir */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Riwayat Servis Terakhir</h2>
            <a href="/customer/riwayat" className="text-xs font-medium text-indigo-600 hover:underline">Lihat Semua Riwayat</a>
          </div>
          {riwayatTerakhir.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada riwayat servis.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {riwayatTerakhir.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{r.layanan?.nama ?? '-'}</p>
                    <p className="text-xs text-slate-400">
                      {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs text-slate-400">{formatTanggalSingkat(r.tanggal)}</p>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status kendaraan */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Status Kendaraan</h2>
          {kendaraanUtama ? (
            <>
              {kendaraanUtama.foto_url ? (
                <img src={kendaraanUtama.foto_url} alt={kendaraanUtama.merek} className="mb-3 h-32 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                  <Car size={28} />
                </div>
              )}
              <p className="text-sm font-semibold text-slate-900">{kendaraanUtama.merek} {kendaraanUtama.model}</p>
              <p className="mb-3 text-xs text-slate-400">{kendaraanUtama.plat_nomor}</p>
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Kondisi</span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {kendaraanUtama.kondisi ?? 'Baik'}
                </span>
              </div>
              <a
                href="/customer/kendaraan"
                className="block rounded-lg bg-[#12123a] py-2.5 text-center text-xs font-semibold text-white hover:bg-[#1c1c52]"
              >
                Lihat Detail
              </a>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <p className="mb-3 text-sm text-slate-400">Belum ada kendaraan terdaftar.</p>
              <a href="/customer/kendaraan" className="inline-block rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]">
                Tambah Kendaraan
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, iconBg, label, value, link, linkText }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      <p className="mb-1 text-xs text-slate-400">{label}</p>
      <p className="mb-2 text-2xl font-bold text-slate-900">{value}</p>
      <a href={link} className="text-xs font-medium text-indigo-600 hover:underline">{linkText} →</a>
    </div>
  )
}