import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, AlertTriangle, Car } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import TombolBayar from '../../components/TombolBayar'
import { StatCard, PillChart, getLastMonths, monthKey, toISO } from '../../components/DashboardParts'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
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
  menunggu_konfirmasi: 'bg-amber-50 text-amber-700 ring-amber-100',
  dijadwalkan: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  diproses: 'bg-blue-50 text-blue-700 ring-blue-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dibatalkan: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const DATA_AWAL = {
  nama: '',
  bookingAktifCount: 0,
  riwayatCount: 0,
  kendaraanCount: 0,
  promoAktifCount: 0,
  bookingBerikutnya: null,
  bookingLunasIds: new Set(),
  riwayatTerakhir: [],
  kendaraanUtama: null,
  promoUnggulan: null,
  bulanan: [],
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DashboardCustomer() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(DATA_AWAL)

  async function loadDashboard() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const todayStr = toISO(new Date())

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
        // Dipakai buat ngecek booking mana yang udah lunas, biar tombol "Bayar" nggak muncul lagi
        supabase.from('transaksi').select('booking_id, status').eq('customer_id', user.id),
      ])

      if (profileRes.error) throw profileRes.error
      if (bookingRes.error) throw bookingRes.error
      if (kendaraanRes.error) throw kendaraanRes.error
      if (promoRes.error) throw promoRes.error
      if (transaksiRes.error) throw transaksiRes.error

      const lunas = new Set(
        (transaksiRes.data ?? []).filter((t) => t.status === 'berhasil').map((t) => t.booking_id)
      )

      const bookings = bookingRes.data ?? []
      const aktif = bookings
        .filter((b) => AKTIF_STATUS.includes(b.status))
        .sort((a, b) => `${a.tanggal}${a.waktu}`.localeCompare(`${b.tanggal}${b.waktu}`))
      const selesai = bookings.filter((b) => b.status === 'selesai')

      // Booking per bulan (6 bulan terakhir), tanpa yang dibatalkan
      const perBulan = new Map()
      for (const b of bookings) {
        if (b.status === 'dibatalkan' || !b.tanggal) continue
        const k = monthKey(b.tanggal)
        perBulan.set(k, (perBulan.get(k) || 0) + 1)
      }

      const kendaraan = kendaraanRes.data ?? []
      const promo = promoRes.data ?? []

      setData({
        nama: profileRes.data?.full_name ?? '',
        bookingAktifCount: aktif.length,
        riwayatCount: selesai.length,
        kendaraanCount: kendaraan.length,
        promoAktifCount: promo.length,
        bookingBerikutnya: aktif[0] ?? null,
        bookingLunasIds: lunas,
        riwayatTerakhir: selesai.slice(0, 4),
        kendaraanUtama: kendaraan.find((k) => k.is_default) ?? kendaraan[0] ?? null,
        promoUnggulan: promo[0] ?? null,
        bulanan: getLastMonths(6).map((m) => ({ ...m, jumlah: perBulan.get(m.key) || 0 })),
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
    nama, bookingAktifCount, riwayatCount, kendaraanCount, promoAktifCount, bookingBerikutnya,
    bookingLunasIds, riwayatTerakhir, kendaraanUtama, promoUnggulan, bulanan,
  } = data

  const namaDepan = nama ? nama.split(' ')[0] : ''
  const totalEnamBulan = bulanan.reduce((sum, m) => sum + m.jumlah, 0)
  const sudahLunas = bookingBerikutnya ? bookingLunasIds.has(bookingBerikutnya.id) : false

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Selamat datang kembali{namaDepan ? `, ${namaDepan}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-400">Kelola servis kendaraan Anda dengan mudah</p>
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
            to="/customer/booking"
            className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
          >
            Booking Servis
          </Link>
          <Link
            to="/customer/promo"
            className="rounded-full border border-[#12123a] px-6 py-3 text-sm font-semibold text-[#12123a] transition hover:bg-white"
          >
            Lihat Promo
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
          title="Booking Aktif"
          value={bookingAktifCount}
          href="/customer/booking"
          note={bookingAktifCount > 0 ? 'servis sedang berjalan' : 'Belum ada booking aktif'}
        />
        <StatCard title="Riwayat Servis" value={riwayatCount} href="/customer/riwayat" note="servis selesai" />
        <StatCard title="Kendaraan" value={kendaraanCount} href="/customer/kendaraan" note="terdaftar di akun Anda" />
        <StatCard title="Promo Aktif" value={promoAktifCount} href="/customer/promo" note="bisa dipakai sekarang" />

        {/* Baris 2: booking berikutnya, promo, kendaraan */}
        <div className="flex flex-col rounded-3xl bg-white p-6 sm:col-span-2">
          <h2 className="text-[15px] font-semibold text-slate-900">Booking Berikutnya</h2>
          {bookingBerikutnya ? (
            <>
              <div className="mt-5 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-semibold leading-snug text-[#12123a]">
                    {bookingBerikutnya.layanan?.nama ?? '-'}
                  </p>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_CLASS[bookingBerikutnya.status]}`}>
                    {STATUS_LABEL[bookingBerikutnya.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {formatTanggalSingkat(bookingBerikutnya.tanggal)}
                  {bookingBerikutnya.waktu ? `, ${bookingBerikutnya.waktu.slice(0, 5)} WIB` : ''}
                </p>
                <p className="text-sm text-slate-400">
                  {[bookingBerikutnya.kendaraan?.merek, bookingBerikutnya.kendaraan?.model].filter(Boolean).join(' ')}{' '}
                  {bookingBerikutnya.kendaraan?.plat_nomor} · {bookingBerikutnya.lokasi ?? 'Kai-Po Elite Garage'}
                </p>
                {(bookingBerikutnya.biaya_final || bookingBerikutnya.biaya_estimasi) && (
                  <p className="mt-3 text-lg font-bold text-slate-900">
                    {formatRupiah(bookingBerikutnya.biaya_final ?? bookingBerikutnya.biaya_estimasi)}
                    {!bookingBerikutnya.biaya_final && (
                      <span className="ml-2 text-xs font-normal text-slate-400">estimasi</span>
                    )}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {sudahLunas ? (
                  <div className="flex items-center rounded-full bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    Sudah Dibayar
                  </div>
                ) : (
                  <TombolBayar
                    bookingId={bookingBerikutnya.id}
                    onSukses={loadDashboard}
                    className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-60"
                  >
                    Bayar Sekarang
                  </TombolBayar>
                )}
                <Link
                  to={`/customer/booking/${bookingBerikutnya.id}`}
                  className="rounded-full border border-[#12123a] px-6 py-3 text-sm font-semibold text-[#12123a] transition hover:bg-slate-50"
                >
                  Lihat Detail
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-5 flex flex-1 flex-col items-start justify-center gap-4">
              <p className="text-sm text-slate-400">Belum ada booking aktif.</p>
              <Link
                to="/customer/booking"
                className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
              >
                Booking Servis Sekarang
              </Link>
            </div>
          )}
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-6 text-white">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[22px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-[14px] border-white/5" />
          <p className="relative text-[15px] font-medium">Promo Untuk Anda</p>
          {promoUnggulan ? (
            <>
              <div className="relative my-6">
                <p className="text-3xl font-bold leading-tight tracking-tight">
                  {promoUnggulan.tipe_diskon === 'persen' ? `${promoUnggulan.nilai}%` : formatRupiah(promoUnggulan.nilai)}
                </p>
                <p className="mt-1 text-sm text-white/80">{promoUnggulan.judul}</p>
                <p className="mt-2 text-xs text-white/50">
                  Hingga {formatTanggalSingkat(promoUnggulan.berlaku_sampai)}
                  {promoUnggulan.min_transaksi ? ` · min. ${formatRupiah(promoUnggulan.min_transaksi)}` : ''}
                </p>
              </div>
              <Link
                to="/customer/promo"
                className="relative rounded-full bg-white py-3.5 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-100"
              >
                Lihat Promo
              </Link>
            </>
          ) : (
            <p className="relative my-6 flex-1 text-sm text-white/60">Belum ada promo aktif saat ini.</p>
          )}
        </div>

        <div className="flex flex-col rounded-3xl bg-white p-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Status Kendaraan</h2>
          {kendaraanUtama ? (
            <>
              {kendaraanUtama.foto_url ? (
                <img
                  src={kendaraanUtama.foto_url}
                  alt={kendaraanUtama.merek}
                  className="mt-4 h-28 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="mt-4 flex h-28 w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <Car size={28} />
                </div>
              )}
              <p className="mt-3 text-sm font-semibold text-slate-900">
                {kendaraanUtama.merek} {kendaraanUtama.model}
              </p>
              <p className="text-xs text-slate-400">{kendaraanUtama.plat_nomor}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {kendaraanUtama.kondisi ?? 'Baik'}
              </div>
              <Link
                to="/customer/kendaraan"
                className="mt-4 rounded-full border border-[#12123a] py-3 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-50"
              >
                Lihat Detail
              </Link>
            </>
          ) : (
            <div className="mt-4 flex flex-1 flex-col items-start justify-center gap-4">
              <p className="text-sm text-slate-400">Belum ada kendaraan terdaftar.</p>
              <Link
                to="/customer/kendaraan"
                className="rounded-full bg-[#12123a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
              >
                Tambah Kendaraan
              </Link>
            </div>
          )}
        </div>

        {/* Baris 3: grafik + riwayat */}
        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-6">
            <h2 className="text-[15px] font-semibold text-slate-900">Aktivitas Servis</h2>
            <p className="mt-0.5 text-xs text-slate-400">{totalEnamBulan} booking dalam 6 bulan terakhir</p>
          </div>
          <PillChart data={bulanan} />
        </div>

        <div className="rounded-3xl bg-white p-6 sm:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Riwayat Servis Terakhir</h2>
            <Link
              to="/customer/riwayat"
              className="rounded-full border border-[#12123a] px-4 py-1.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
            >
              Lihat Semua
            </Link>
          </div>
          {riwayatTerakhir.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada riwayat servis.</p>
          ) : (
            <ul className="space-y-4">
              {riwayatTerakhir.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
                    <Car size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.layanan?.nama ?? '-'}</p>
                    <p className="truncate text-xs text-slate-400">
                      {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs text-slate-400">{formatTanggalSingkat(r.tanggal)}</p>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                      Selesai
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}