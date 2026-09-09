import { useEffect, useMemo, useState } from 'react'
import { Search, Wallet, Clock, RotateCcw, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PER_PAGE = 8

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABEL = { menunggu: 'Menunggu', berhasil: 'Berhasil', gagal: 'Gagal', refund: 'Refund' }
const STATUS_CLASS = {
  menunggu: 'bg-amber-100 text-amber-700',
  berhasil: 'bg-emerald-100 text-emerald-700',
  gagal: 'bg-rose-100 text-rose-700',
  refund: 'bg-slate-100 text-slate-500',
}

const JENIS_LABEL = { servis: 'Servis', produk: 'Produk' }
const JENIS_CLASS = { servis: 'bg-blue-100 text-blue-700', produk: 'bg-indigo-100 text-indigo-700' }

const TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'berhasil', label: 'Berhasil' },
  { key: 'gagal', label: 'Gagal' },
  { key: 'refund', label: 'Refund' },
]

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function Transaksi() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [transaksiList, setTransaksiList] = useState([])

  const [activeTab, setActiveTab] = useState('semua')
  const [jenisFilter, setJenisFilter] = useState('semua')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [updatingId, setUpdatingId] = useState(null)

  async function loadData() {
    try {
      setError(null)
      const [transaksiRes, itemRes] = await Promise.all([
        supabase
          .from('transaksi')
          .select(`
            id, kode_transaksi, jenis, total, metode_pembayaran, status, created_at,
            customer:customer_id ( full_name ),
            booking:booking_id ( kode_booking, layanan:layanan_id ( nama ) )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('transaksi_item').select('transaksi_id, qty'),
      ])

      if (transaksiRes.error) throw transaksiRes.error
      if (itemRes.error) throw itemRes.error

      // Hitung total item per transaksi produk (buat ditampilin di kolom "Item")
      const itemCount = new Map()
      for (const it of itemRes.data ?? []) {
        itemCount.set(it.transaksi_id, (itemCount.get(it.transaksi_id) || 0) + (it.qty || 0))
      }

      const merged = (transaksiRes.data ?? []).map((t) => ({ ...t, jumlahItem: itemCount.get(t.id) || 0 }))
      setTransaksiList(merged)
    } catch (err) {
      console.error('Gagal memuat data transaksi:', err)
      setError(err.message || 'Gagal memuat data transaksi')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function ubahStatus(transaksi, statusBaru) {
    setUpdatingId(transaksi.id)
    try {
      const { error: updateError } = await supabase
        .from('transaksi')
        .update({ status: statusBaru })
        .eq('id', transaksi.id)
      if (updateError) throw updateError
      setTransaksiList((prev) => prev.map((t) => (t.id === transaksi.id ? { ...t, status: statusBaru } : t)))
    } catch (err) {
      console.error('Gagal ubah status:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const counts = useMemo(() => {
    const c = { semua: transaksiList.length, menunggu: 0, berhasil: 0, gagal: 0, refund: 0 }
    for (const t of transaksiList) {
      if (c[t.status] !== undefined) c[t.status] += 1
    }
    return c
  }, [transaksiList])

  const stats = useMemo(() => {
    const pendapatan = transaksiList.filter((t) => t.status === 'berhasil').reduce((sum, t) => sum + Number(t.total || 0), 0)
    return { total: transaksiList.length, pendapatan, menunggu: counts.menunggu, refund: counts.refund }
  }, [transaksiList, counts])

  const filtered = useMemo(() => {
    let rows = [...transaksiList]
    if (activeTab !== 'semua') rows = rows.filter((t) => t.status === activeTab)
    if (jenisFilter !== 'semua') rows = rows.filter((t) => t.jenis === jenisFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (t) => t.kode_transaksi?.toLowerCase().includes(q) || t.customer?.full_name?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [transaksiList, activeTab, jenisFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [activeTab, jenisFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data transaksi...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Transaksi</h1>
        <p className="mt-1 text-sm text-slate-400">Riwayat pembayaran servis dan pembelian produk dari customer</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Receipt size={16} />} iconBg="bg-indigo-100 text-indigo-600" label="Total Transaksi" value={stats.total} />
        <StatCard icon={<Wallet size={16} />} iconBg="bg-emerald-100 text-emerald-600" label="Pendapatan (Berhasil)" value={formatRupiah(stats.pendapatan)} />
        <StatCard icon={<Clock size={16} />} iconBg="bg-amber-100 text-amber-600" label="Menunggu Pembayaran" value={stats.menunggu} />
        <StatCard icon={<RotateCcw size={16} />} iconBg="bg-slate-100 text-slate-500" label="Refund" value={stats.refund} />
      </div>

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
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={jenisFilter}
          onChange={(e) => setJenisFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Jenis</option>
          <option value="servis">Servis</option>
          <option value="produk">Produk</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode transaksi / customer..."
            className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {paginated.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada transaksi yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Kode Transaksi</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Jenis</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Metode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <tr key={t.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">#{t.kode_transaksi}</p>
                      <p className="text-xs text-slate-400">{formatTanggal(t.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.customer?.full_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${JENIS_CLASS[t.jenis] || 'bg-slate-100 text-slate-600'}`}>
                        {JENIS_LABEL[t.jenis] || t.jenis}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {t.jenis === 'servis'
                        ? t.booking?.layanan?.nama ?? '-'
                        : `${t.jumlahItem} item`}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatRupiah(t.total)}</td>
                    <td className="px-4 py-3 text-slate-700">{t.metode_pembayaran || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[t.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'menunggu' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => ubahStatus(t, 'berhasil')}
                            disabled={updatingId === t.id}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            Tandai Berhasil
                          </button>
                          <button
                            onClick={() => ubahStatus(t, 'gagal')}
                            disabled={updatingId === t.id}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Tandai Gagal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => alert('Halaman detail transaksi belum dibikin.')}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
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
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')} transaksi
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, pageSafe - 3), pageSafe + 2)
              .map((n) => (
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

function StatCard({ icon, iconBg, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}