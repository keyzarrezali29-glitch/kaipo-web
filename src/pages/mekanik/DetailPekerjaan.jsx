import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Wrench, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles, Phone, Calendar, X, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import SparepartServis from '../../components/SparepartServis'

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

function bukaWhatsApp(phone) {
  let nomor = String(phone || '').replace(/\D/g, '')
  if (!nomor) return
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
  window.open(`https://wa.me/${nomor}`, '_blank', 'noopener,noreferrer')
}

// foto_url bisa berupa URL penuh atau path di bucket kendaraan-foto; dua-duanya ditangani
function getFotoUrl(fotoUrl) {
  if (!fotoUrl) return null
  if (/^https?:\/\//i.test(fotoUrl)) return fotoUrl
  const { data } = supabase.storage.from('kendaraan-foto').getPublicUrl(fotoUrl)
  return data?.publicUrl ?? null
}

const STATUS_LABEL = { dijadwalkan: 'Menunggu', diproses: 'Dikerjakan', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
const STATUS_CLASS = {
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

const TABS = [
  { key: 'aktif', label: 'Aktif' },
  { key: 'dijadwalkan', label: 'Menunggu' },
  { key: 'diproses', label: 'Dikerjakan' },
  { key: 'selesai', label: 'Selesai' },
]

const PER_PAGE = 8

// ------------------------------------------------------------
// Foto kendaraan (thumbnail, klik untuk perbesar). Kalau belum ada foto / gagal dimuat -> ikon layanan.
// ------------------------------------------------------------
function FotoKendaraan({ url, icon, onClick }) {
  const [gagal, setGagal] = useState(false)

  if (!url || gagal) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <IconFor name={icon} size={19} />
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Lihat foto kendaraan"
      className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 transition hover:ring-[#12123a]"
    >
      <img
        src={url}
        alt="Foto kendaraan"
        loading="lazy"
        onError={() => setGagal(true)}
        className="h-full w-full object-cover"
      />
    </button>
  )
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DaftarPekerjaan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookingList, setBookingList] = useState([])
  const [activeTab, setActiveTab] = useState('aktif')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [updatingId, setUpdatingId] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null) // { url, label }
  const [sparepartJobId, setSparepartJobId] = useState(null) // id booking yang sparepartnya sedang dibuka
  const [tolakJobId, setTolakJobId] = useState(null) // id booking yang sedang akan ditolak
  const [alasanTolak, setAlasanTolak] = useState('')
  const [tolakError, setTolakError] = useState('')
  const [menolak, setMenolak] = useState(false)

  async function loadData() {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Belum login')

      const { data, error: fetchError } = await supabase
        .from('booking')
        .select(`
          id, kode_booking, tanggal, waktu, status, catatan,
          customer:customer_id ( full_name, phone, avatar_url ),
          kendaraan:kendaraan_id ( merek, model, plat_nomor, foto_url ),
          layanan:layanan_id ( nama, icon )
        `)
        .eq('mekanik_id', user.id)
        .order('tanggal', { ascending: false })
        .order('waktu', { ascending: false })

      if (fetchError) throw fetchError
      setBookingList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat daftar pekerjaan:', err)
      setError(err.message || 'Gagal memuat daftar pekerjaan')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  // Tutup modal (foto kendaraan / sparepart) dengan tombol Escape
  useEffect(() => {
    if (!fotoPreview && !sparepartJobId && !tolakJobId) return
    function onKey(e) {
      if (e.key === 'Escape' && !menolak) {
        setFotoPreview(null)
        setSparepartJobId(null)
        setTolakJobId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fotoPreview, sparepartJobId, tolakJobId, menolak])

  async function handleUpdateStatus(bookingId, statusBaru) {
    setUpdatingId(bookingId)
    try {
      const { error: updateError } = await supabase.from('booking').update({ status: statusBaru }).eq('id', bookingId)
      if (updateError) throw updateError
      await loadData()
    } catch (err) {
      alert('Gagal update status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleTolak() {
    setTolakError('')
    const alasan = alasanTolak.trim()
    if (alasan.length < 5) {
      setTolakError('Tulis alasan penolakan (minimal 5 karakter) supaya admin bisa menugaskan mekanik lain.')
      return
    }
    setMenolak(true)
    try {
      const { error: rpcError } = await supabase.rpc('tolak_booking', { p_booking_id: tolakJobId, p_alasan: alasan })
      if (rpcError) throw rpcError
      setTolakJobId(null)
      setAlasanTolak('')
      await loadData()
    } catch (err) {
      console.error('Gagal menolak booking:', err)
      setTolakError(err.message || 'Gagal menolak booking.')
    } finally {
      setMenolak(false)
    }
  }

  // Cuma pekerjaan "dijadwalkan" paling depan (berdasar tanggal+waktu terdekat) yang boleh langsung "Mulai Servis"
  const idDijadwalkanPertama = useMemo(() => {
    const menunggu = bookingList
      .filter((b) => b.status === 'dijadwalkan')
      .sort((a, b) => `${a.tanggal}${a.waktu}`.localeCompare(`${b.tanggal}${b.waktu}`))
    return menunggu[0]?.id
  }, [bookingList])

  const counts = useMemo(() => {
    const c = { aktif: 0, dijadwalkan: 0, diproses: 0, selesai: 0 }
    for (const b of bookingList) {
      if (b.status === 'dijadwalkan' || b.status === 'diproses') c.aktif += 1
      if (c[b.status] !== undefined) c[b.status] += 1
    }
    return c
  }, [bookingList])

  const filtered = useMemo(() => {
    let rows = [...bookingList]
    if (activeTab === 'aktif') rows = rows.filter((b) => b.status === 'dijadwalkan' || b.status === 'diproses')
    else rows = rows.filter((b) => b.status === activeTab)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (b) =>
          b.customer?.full_name?.toLowerCase().includes(q) ||
          b.kendaraan?.plat_nomor?.toLowerCase().includes(q) ||
          b.kode_booking?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [bookingList, activeTab, search])

  const jobSparepart = bookingList.find((b) => b.id === sparepartJobId) ?? null
  const jobTolak = bookingList.find((b) => b.id === tolakJobId) ?? null

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [activeTab, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat daftar pekerjaan...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Daftar Pekerjaan</h1>
        <p className="mt-1 text-sm text-slate-400">Semua pekerjaan servis yang ditugaskan ke Anda</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari customer / plat nomor..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* List */}
      {paginated.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
          Nggak ada pekerjaan yang cocok dengan filter ini.
        </p>
      ) : (
        <ul className="space-y-3">
          {paginated.map((job) => {
            const fotoUrl = getFotoUrl(job.kendaraan?.foto_url)
            const namaKendaraan = [job.kendaraan?.merek, job.kendaraan?.model].filter(Boolean).join(' ')
            const labelFoto = [namaKendaraan, job.kendaraan?.plat_nomor].filter(Boolean).join(' · ')

            return (
              <li key={job.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Kiri: foto kendaraan + layanan + customer */}
                  <div className="flex flex-1 items-start gap-3">
                    <FotoKendaraan
                      url={fotoUrl}
                      icon={job.layanan?.icon}
                      onClick={() => setFotoPreview({ url: fotoUrl, label: labelFoto })}
                    />
                    <div className="min-w-0 flex-1">
                      {/* Judul servis + status */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{job.layanan?.nama ?? '-'}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[job.status]}`}>
                          {STATUS_LABEL[job.status]}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">#{job.kode_booking}</span>
                      </div>

                      {/* Nama customer */}
                      <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                        <Avatar nama={job.customer?.full_name} url={job.customer?.avatar_url} className="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-400">Customer</p>
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {job.customer?.full_name ?? '-'}
                          </p>
                        </div>
                        {job.customer?.phone && (
                          <button
                            type="button"
                            onClick={() => bukaWhatsApp(job.customer.phone)}
                            title="Hubungi via WhatsApp"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            <Phone size={14} />
                          </button>
                        )}
                      </div>

                      {/* Kendaraan + jadwal */}
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
                        <Car size={12} />
                        {namaKendaraan || '-'}
                        {job.kendaraan?.plat_nomor && <span>· {job.kendaraan.plat_nomor}</span>}
                        <span className="text-slate-300">•</span>
                        <Calendar size={12} />
                        {formatTanggal(job.tanggal)}, {job.waktu?.slice(0, 5)} WIB
                      </p>

                      {job.catatan && (
                        <p className="mt-2 line-clamp-1 text-xs text-slate-400">Keluhan: {job.catatan}</p>
                      )}
                    </div>
                  </div>

                  {/* Kanan: aksi */}
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
                    {job.status === 'diproses' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'selesai')}
                        disabled={updatingId === job.id}
                        className="rounded-lg bg-indigo-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {updatingId === job.id ? '...' : 'Tandai Selesai'}
                      </button>
                    )}
                    {job.status === 'dijadwalkan' && job.id === idDijadwalkanPertama && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'diproses')}
                        disabled={updatingId === job.id}
                        className="rounded-lg bg-indigo-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {updatingId === job.id ? '...' : 'Mulai Servis'}
                      </button>
                    )}
                    {job.status === 'dijadwalkan' && job.id !== idDijadwalkanPertama && (
                      <span className="text-center text-xs text-slate-400">Selesaikan kerjaan yang lagi jalan dulu</span>
                    )}
                    {job.status === 'dijadwalkan' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTolakJobId(job.id)
                          setAlasanTolak('')
                          setTolakError('')
                        }}
                        className="rounded-lg border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Tolak
                      </button>
                    )}
                    {(job.status === 'diproses' || job.status === 'selesai') && (
                      <button
                        type="button"
                        onClick={() => setSparepartJobId(job.id)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Package size={13} />
                        {job.status === 'diproses' ? 'Catat Sparepart' : 'Lihat Sparepart'}
                      </button>
                    )}
                    <Link
                      to={`/mekanik/pekerjaan/${job.id}`}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length} pekerjaan
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

      {/* Modal preview foto kendaraan */}
      {fotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setFotoPreview(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFotoPreview(null)}
              title="Tutup"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
            <p className="mb-4 pr-12 text-[15px] font-semibold text-slate-900">{fotoPreview.label || 'Foto kendaraan'}</p>
            <img
              src={fotoPreview.url}
              alt="Foto kendaraan"
              className="max-h-[70vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Modal sparepart servis */}
      {jobSparepart && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4"
          onClick={() => setSparepartJobId(null)}
        >
          <div className="relative mx-auto mt-[8vh] w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-xs font-medium text-white/80">
              #{jobSparepart.kode_booking} · {jobSparepart.layanan?.nama ?? '-'}
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSparepartJobId(null)}
                title="Tutup"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
              <SparepartServis
                bookingId={jobSparepart.id}
                status={jobSparepart.status}
                readOnly={jobSparepart.status !== 'diproses'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal tolak booking */}
      {jobTolak && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => !menolak && setTolakJobId(null)}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-slate-900">Tolak booking</h3>
            <p className="mt-1 text-xs text-slate-400">
              #{jobTolak.kode_booking} · {jobTolak.layanan?.nama ?? '-'} · {formatTanggal(jobTolak.tanggal)}, {jobTolak.waktu?.slice(0, 5)} WIB
            </p>

            <label className="mb-1.5 mt-5 block text-xs font-semibold text-slate-600">Alasan penolakan</label>
            <textarea
              value={alasanTolak}
              onChange={(e) => setAlasanTolak(e.target.value)}
              rows={4}
              maxLength={300}
              placeholder="Contoh: jadwal bentrok dengan servis lain, sedang tidak enak badan."
              className="w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-[#12123a]"
            />

            {tolakError && (
              <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{tolakError}</p>
            )}

            <p className="mt-3 text-[11px] text-slate-400">
              Booking akan kembali ke admin beserta alasanmu, lalu ditugaskan ke mekanik lain.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setTolakJobId(null)}
                disabled={menolak}
                className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTolak}
                disabled={menolak}
                className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {menolak ? 'Memproses...' : 'Tolak Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}