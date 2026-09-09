import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
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

const TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu_konfirmasi', label: 'Menunggu Konfirmasi' },
  { key: 'dijadwalkan', label: 'Dijadwalkan' },
  { key: 'diproses', label: 'Diproses' },
  { key: 'selesai', label: 'Selesai' },
]

const PER_PAGE = 7

function inisial(nama) {
  if (!nama) return '?'
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = ['bg-indigo-900', 'bg-violet-600', 'bg-sky-700', 'bg-emerald-700', 'bg-rose-700']
function avatarColor(seed) {
  const i = (seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function BookingServis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [layananList, setLayananList] = useState([])
  const [mekanikList, setMekanikList] = useState([])

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
      const [bookingRes, layananRes, mekanikRes] = await Promise.all([
        supabase
          .from('booking')
          .select(`
            id, kode_booking, tanggal, waktu, status, mekanik_id,
            customer:customer_id ( full_name ),
            kendaraan:kendaraan_id ( merek, model ),
            layanan:layanan_id ( id, nama ),
            mekanik:mekanik_id ( full_name )
          `)
          .order('tanggal', { ascending: false })
          .order('waktu', { ascending: false }),
        supabase.from('layanan').select('id, nama').eq('is_active', true).order('nama'),
        supabase.from('profiles').select('id, full_name').eq('role', 'mekanik').order('full_name'),
      ])

      if (bookingRes.error) throw bookingRes.error
      if (layananRes.error) throw layananRes.error
      if (mekanikRes.error) throw mekanikRes.error

      setBookings(bookingRes.data ?? [])
      setLayananList(layananRes.data ?? [])
      setMekanikList(mekanikRes.data ?? [])
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

  async function handleKonfirmasi(bookingId) {
    const mekanikId = pilihMekanik[bookingId]
    if (!mekanikId) return

    setConfirming(bookingId)
    try {
      const { error: updateError } = await supabase
        .from('booking')
        .update({ status: 'dijadwalkan', mekanik_id: mekanikId })
        .eq('id', bookingId)
      if (updateError) throw updateError

      await supabase.from('booking_status_log').insert({ booking_id: bookingId, status: 'dijadwalkan' })

      await loadData()
    } catch (err) {
      console.error('Gagal konfirmasi booking:', err)
      alert('Gagal konfirmasi booking: ' + err.message)
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
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Servis</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola dan konfirmasi booking servis yang masuk dari customer</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Tabs status */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={tanggalFilter}
          onChange={(e) => setTanggalFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Tanggal: Semua</option>
          <option value="hari_ini">Tanggal: Hari Ini</option>
        </select>

        <select
          value={layananFilter}
          onChange={(e) => setLayananFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Layanan</option>
          {layananList.map((l) => (
            <option key={l.id} value={l.id}>{l.nama}</option>
          ))}
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode booking / customer..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {paginated.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada booking yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Layanan</th>
                  <th className="px-4 py-3 font-medium">Jadwal</th>
                  <th className="px-4 py-3 font-medium">Mekanik</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => (
                  <tr key={b.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColor(b.customer?.full_name)}`}>
                          {inisial(b.customer?.full_name)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{b.customer?.full_name ?? '-'}</p>
                          <p className="text-xs text-slate-400">
                            #{b.kode_booking} · {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{b.layanan?.nama ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatTanggal(b.tanggal)}{b.waktu ? `, ${b.waktu.slice(0, 5)}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {b.mekanik?.full_name ? (
                        <span className="text-slate-700">{b.mekanik.full_name}</span>
                      ) : b.status === 'menunggu_konfirmasi' ? (
                        <select
                          value={pilihMekanik[b.id] ?? ''}
                          onChange={(e) => setPilihMekanik((prev) => ({ ...prev, [b.id]: e.target.value }))}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-600 outline-none"
                        >
                          <option value="">Belum ditugaskan</option>
                          {mekanikList.map((m) => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status === 'menunggu_konfirmasi' ? (
                        <button
                          onClick={() => handleKonfirmasi(b.id)}
                          disabled={!pilihMekanik[b.id] || confirming === b.id}
                          className="rounded-lg bg-[#12123a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-40"
                        >
                          {confirming === b.id ? 'Memproses...' : 'Konfirmasi'}
                        </button>
                      ) : (
                        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length} booking
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-xs font-medium ${
                  n === pageSafe ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}