import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getTodayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Kunci slot jadwal: tanggal + jam (HH:MM), dipakai untuk mencari mekanik yang bentrok
function kunciSlot(b) {
  return `${b.tanggal}|${String(b.waktu ?? '').slice(0, 5)}`
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

const STATUS_DOT = {
  menunggu_konfirmasi: 'bg-blue-500',
  dijadwalkan: 'bg-amber-500',
  diproses: 'bg-indigo-500',
  selesai: 'bg-emerald-500',
  dibatalkan: 'bg-rose-500',
}

const TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu_konfirmasi', label: 'Menunggu Konfirmasi' },
  { key: 'dijadwalkan', label: 'Dijadwalkan' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'selesai', label: 'Selesai' },
]

const PER_PAGE = 7

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function BookingServis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [layananList, setLayananList] = useState([])
  const [mekanikList, setMekanikList] = useState([]) // { id, full_name, status_kerja }

  const [activeTab, setActiveTab] = useState('semua')
  const [tanggalFilter, setTanggalFilter] = useState('semua') // 'semua' | 'hari_ini'
  const [layananFilter, setLayananFilter] = useState('semua')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // pilihan mekanik yang belum dikonfirmasi, per booking id
  const [pilihMekanik, setPilihMekanik] = useState({})
  const [confirming, setConfirming] = useState(null)

  async function loadData() {
    try {
      setError(null)
      const [bookingRes, layananRes, mekanikRes, detailRes] = await Promise.all([
        supabase
          .from('booking')
          .select(`
            id, kode_booking, tanggal, waktu, status, mekanik_id,
            customer:customer_id ( full_name, avatar_url ),
            kendaraan:kendaraan_id ( merek, model ),
            layanan:layanan_id ( id, nama ),
            mekanik:mekanik_id ( full_name, avatar_url )
          `)
          .order('tanggal', { ascending: false })
          .order('waktu', { ascending: false }),
        supabase.from('layanan').select('id, nama').eq('is_active', true).order('nama'),
        supabase.from('profiles').select('id, full_name, is_active').eq('role', 'mekanik').order('full_name'),
        supabase.from('mekanik_detail').select('profile_id, status_kerja'),
      ])

      if (bookingRes.error) throw bookingRes.error
      if (layananRes.error) throw layananRes.error
      if (mekanikRes.error) throw mekanikRes.error
      // Status kerja tidak fatal: kalau gagal dimuat, semua mekanik dianggap tersedia
      if (detailRes.error) console.warn('Gagal memuat status kerja mekanik:', detailRes.error)

      const statusMap = {}
      for (const d of detailRes.data ?? []) statusMap[d.profile_id] = d.status_kerja

      setBookings(bookingRes.data ?? [])
      setLayananList(layananRes.data ?? [])
      setMekanikList(
        (mekanikRes.data ?? [])
          .filter((m) => m.is_active !== false) // mekanik nonaktif tidak bisa ditugaskan
          .map((m) => ({ id: m.id, full_name: m.full_name, status_kerja: statusMap[m.id] ?? 'tersedia' }))
      )
    } catch (err) {
      console.error('Gagal memuat booking:', err)
      setError(err.message || 'Gagal memuat data booking')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))

    // Real-time: setiap ada booking baru / berubah di tabel `booking`,
    // langsung refetch list-nya tanpa nunggu refresh manual.
    const channel = supabase
      .channel('booking-realtime-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Peta jadwal mekanik: 'tanggal|jam' -> Set(id mekanik yang sudah punya booking aktif di slot itu)
  const jadwalMekanik = useMemo(() => {
    const peta = new Map()
    for (const b of bookings) {
      if (!b.mekanik_id || b.status === 'dibatalkan') continue
      const key = kunciSlot(b)
      if (!peta.has(key)) peta.set(key, new Set())
      peta.get(key).add(b.mekanik_id)
    }
    return peta
  }, [bookings])

  // Alasan mekanik tidak bisa dipilih untuk booking tertentu (null = bisa dipilih)
  function alasanTidakTersedia(m, b) {
    if (jadwalMekanik.get(kunciSlot(b))?.has(m.id)) return 'sudah ada jadwal'
    if (m.status_kerja === 'libur') return 'libur'
    return null
  }

  async function handleKonfirmasi(bookingId) {
    const mekanikId = pilihMekanik[bookingId]
    if (!mekanikId) return
    const booking = bookings.find((x) => x.id === bookingId)
    if (!booking) return

    setConfirming(bookingId)
    try {
      // Cek ulang ke database tepat sebelum konfirmasi (misal admin lain baru saja menugaskan mekanik yang sama)
      const { data: bentrok, error: cekError } = await supabase
        .from('booking')
        .select('id')
        .eq('mekanik_id', mekanikId)
        .eq('tanggal', booking.tanggal)
        .eq('waktu', booking.waktu)
        .neq('status', 'dibatalkan')
        .neq('id', bookingId)
        .limit(1)
      if (cekError) throw cekError

      if (bentrok && bentrok.length > 0) {
        alert('Mekanik tersebut baru saja mendapat jadwal di jam ini. Pilih mekanik lain.')
        setPilihMekanik((prev) => ({ ...prev, [bookingId]: '' }))
        await loadData()
        return
      }

      const { error: updateError } = await supabase
        .from('booking')
        .update({ status: 'dijadwalkan', mekanik_id: mekanikId })
        .eq('id', bookingId)
      if (updateError) throw updateError

      await supabase.from('booking_status_log').insert({ booking_id: bookingId, status: 'dijadwalkan' })

      await loadData()
    } catch (err) {
      console.error('Gagal konfirmasi booking:', err)
      if (String(err.message || '').includes('MEKANIK_BENTROK')) {
        alert('Mekanik tersebut sudah punya jadwal di jam ini. Pilih mekanik lain.')
        await loadData()
      } else {
        alert('Gagal konfirmasi booking: ' + err.message)
      }
    } finally {
      setConfirming(null)
    }
  }

  // Hitung jumlah booking per status (buat badge di tab)
  const counts = useMemo(() => {
    const c = { semua: bookings.length, menunggu_konfirmasi: 0, dijadwalkan: 0, diproses: 0, selesai: 0 }
    for (const b of bookings) {
      if (c[b.status] !== undefined) c[b.status] += 1
    }
    return c
  }, [bookings])

  // Terapkan semua filter
  const filtered = useMemo(() => {
    const todayStr = getTodayISO()
    return bookings.filter((b) => {
      if (activeTab !== 'semua' && b.status !== activeTab) return false
      if (tanggalFilter === 'hari_ini' && b.tanggal !== todayStr) return false
      if (layananFilter !== 'semua' && b.layanan?.id !== layananFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const match =
          b.kode_booking?.toLowerCase().includes(q) ||
          b.customer?.full_name?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [bookings, activeTab, tanggalFilter, layananFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  // reset ke halaman 1 tiap kali filter berubah
  useEffect(() => setPage(1), [activeTab, tanggalFilter, layananFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat booking...</div>
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Booking Servis</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola dan konfirmasi booking servis yang masuk dari customer</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Tabs status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={tanggalFilter}
          onChange={(e) => setTanggalFilter(e.target.value)}
          className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
        >
          <option value="semua">Tanggal: Semua</option>
          <option value="hari_ini">Tanggal: Hari Ini</option>
        </select>

        <select
          value={layananFilter}
          onChange={(e) => setLayananFilter(e.target.value)}
          className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
        >
          <option value="semua">Semua Layanan</option>
          {layananList.map((l) => (
            <option key={l.id} value={l.id}>{l.nama}</option>
          ))}
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode booking / customer..."
            className="w-64 rounded-full bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-3xl bg-white p-3">
        {paginated.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">Tidak ada booking yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="rounded-l-2xl px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-4 py-3.5 font-medium">Layanan</th>
                  <th className="px-4 py-3.5 font-medium">Jadwal</th>
                  <th className="px-4 py-3.5 font-medium">Mekanik</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="rounded-r-2xl px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => {
                  const menunggu = b.status === 'menunggu_konfirmasi'

                  // Ketersediaan mekanik untuk tanggal + jam booking ini
                  const jumlahTersedia = mekanikList.filter((m) => !alasanTidakTersedia(m, b)).length
                  const tidakAdaMekanik = jumlahTersedia === 0
                  const mekanikDipilih = mekanikList.find((m) => m.id === pilihMekanik[b.id])
                  // Pilihan dianggap tidak valid kalau mekanik yang dipilih ternyata sudah bentrok / libur
                  const sudahPilih = Boolean(mekanikDipilih) && !alasanTidakTersedia(mekanikDipilih, b)

                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 ${
                        menunggu ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <Avatar nama={b.customer?.full_name} url={b.customer?.avatar_url} className="h-11 w-11 text-sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{b.customer?.full_name ?? '-'}</p>
                            <p className="mt-0.5 font-mono text-xs text-slate-400">#{b.kode_booking}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{b.layanan?.nama ?? '-'}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">{formatTanggal(b.tanggal)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{b.waktu ? `${b.waktu.slice(0, 5)} WIB` : '-'}</p>
                      </td>

                      <td className="px-4 py-4">
                        {b.mekanik?.full_name ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar nama={b.mekanik.full_name} url={b.mekanik.avatar_url} className="h-8 w-8 text-[11px]" />
                            <span className="font-medium text-slate-700">{b.mekanik.full_name}</span>
                          </div>
                        ) : menunggu ? (
                          <select
                            value={sudahPilih ? pilihMekanik[b.id] : ''}
                            disabled={tidakAdaMekanik}
                            onChange={(e) => setPilihMekanik((prev) => ({ ...prev, [b.id]: e.target.value }))}
                            title={
                              tidakAdaMekanik
                                ? 'Semua mekanik sedang libur atau sudah punya jadwal di jam ini'
                                : undefined
                            }
                            className={`rounded-full px-4 py-2 text-xs font-semibold outline-none ring-1 ring-inset transition ${
                              tidakAdaMekanik
                                ? 'cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200'
                                : sudahPilih
                                  ? 'cursor-pointer bg-emerald-50 text-emerald-700 ring-emerald-100'
                                  : 'cursor-pointer bg-rose-50 text-rose-600 ring-rose-100'
                            }`}
                          >
                            <option value="">
                              {tidakAdaMekanik ? 'Tidak ada mekanik tersedia' : 'Pilih mekanik'}
                            </option>
                            {mekanikList.map((m) => {
                              const alasan = alasanTidakTersedia(m, b)
                              return (
                                <option
                                  key={m.id}
                                  value={m.id}
                                  disabled={Boolean(alasan)}
                                  className={alasan ? 'text-slate-300' : 'text-slate-800'}
                                >
                                  {m.full_name}{alasan ? ` (${alasan})` : ''}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                            STATUS_CLASS[b.status] || 'bg-slate-50 text-slate-600 ring-slate-100'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[b.status] || 'bg-slate-400'}`} />
                          {STATUS_LABEL[b.status] || b.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {menunggu ? (
                          <button
                            onClick={() => handleKonfirmasi(b.id)}
                            disabled={!sudahPilih || confirming === b.id}
                            title={
                              tidakAdaMekanik
                                ? 'Tidak ada mekanik yang tersedia di jam ini'
                                : sudahPilih
                                  ? 'Konfirmasi booking ini'
                                  : 'Pilih mekanik dulu'
                            }
                            className="rounded-full bg-[#12123a] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1c1c52] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            {confirming === b.id ? 'Memproses...' : 'Konfirmasi'}
                          </button>
                        ) : (
                          <Link
                            to={`/admin/booking/${b.id}`}
                            className="inline-block rounded-full border border-slate-200 px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-[#12123a] hover:text-[#12123a]"
                          >
                            Detail
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length} booking
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-9 w-9 rounded-full text-xs font-medium ${
                  n === pageSafe ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}