import { useEffect, useMemo, useState } from 'react'
import { Search, Wrench, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ICON_MAP = { wrench: Wrench, engine: Settings2, bolt: Zap, wheel: Disc3, oil: Droplet, car: Car, aircon: Wind, sparkles: Sparkles }
function IconFor({ name, size = 16 }) {
  const Comp = ICON_MAP[name] || Wrench
  return <Comp size={size} />
}

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_CLASS = { selesai: 'bg-emerald-100 text-emerald-700', dibatalkan: 'bg-rose-100 text-rose-700' }
const STATUS_LABEL = { selesai: 'Selesai', dibatalkan: 'Dibatalkan' }

const PER_PAGE = 8

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function RiwayatPekerjaan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [riwayatList, setRiwayatList] = useState([])

  const [dariTanggal, setDariTanggal] = useState(daysAgoISO(30))
  const [sampaiTanggal, setSampaiTanggal] = useState(todayISO())
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  async function loadData() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const sampaiInklusif = new Date(sampaiTanggal)
      sampaiInklusif.setDate(sampaiInklusif.getDate() + 1)

      const { data, error: fetchError } = await supabase
        .from('booking')
        .select(`
          id, kode_booking, tanggal, waktu, status,
          customer:customer_id ( full_name ),
          kendaraan:kendaraan_id ( merek, model, plat_nomor ),
          layanan:layanan_id ( nama, icon, harga )
        `)
        .eq('mekanik_id', user.id)
        .in('status', ['selesai', 'dibatalkan'])
        .gte('tanggal', dariTanggal)
        .lt('tanggal', sampaiInklusif.toISOString().slice(0, 10))
        .order('tanggal', { ascending: false })

      if (fetchError) throw fetchError
      setRiwayatList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat riwayat pekerjaan:', err)
      setError(err.message || 'Gagal memuat riwayat pekerjaan')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dariTanggal, sampaiTanggal])

  const stats = useMemo(() => {
    const selesai = riwayatList.filter((r) => r.status === 'selesai').length
    const dibatalkan = riwayatList.filter((r) => r.status === 'dibatalkan').length
    return { selesai, dibatalkan }
  }, [riwayatList])

  const filtered = useMemo(() => {
    if (!search.trim()) return riwayatList
    const q = search.trim().toLowerCase()
    return riwayatList.filter(
      (r) =>
        r.customer?.full_name?.toLowerCase().includes(q) ||
        r.kendaraan?.plat_nomor?.toLowerCase().includes(q) ||
        r.kode_booking?.toLowerCase().includes(q)
    )
  }, [riwayatList, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [search, dariTanggal, sampaiTanggal])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat riwayat pekerjaan...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Pekerjaan</h1>
          <p className="mt-1 text-sm text-slate-400">Semua pekerjaan servis yang sudah Anda selesaikan</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => setDariTanggal(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
          />
          <span className="text-sm text-slate-400">—</span>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => setSampaiTanggal(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Stat mini */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><CheckCircle2 size={16} /></span>
          <div>
            <p className="text-xs text-slate-400">Selesai (periode dipilih)</p>
            <p className="text-lg font-bold text-slate-900">{stats.selesai}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600"><XCircle size={16} /></span>
          <div>
            <p className="text-xs text-slate-400">Dibatalkan (periode dipilih)</p>
            <p className="text-lg font-bold text-slate-900">{stats.dibatalkan}</p>
          </div>
        </div>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari customer / plat nomor..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
        />
      </div>

      {paginated.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
          Nggak ada riwayat pekerjaan di periode/pencarian ini.
        </p>
      ) : (
        <ul className="space-y-3">
          {paginated.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <IconFor name={r.layanan?.icon} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {r.layanan?.nama ?? '-'} — {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    #{r.kode_booking} · {r.customer?.full_name ?? '-'} · {formatTanggal(r.tanggal)}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length} riwayat
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
                className={`h-8 w-8 rounded-lg text-xs font-medium ${n === pageSafe ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
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