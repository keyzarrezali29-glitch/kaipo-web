import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ClipboardCheck, CheckCircle2, Clock, CalendarOff, X, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function inisial(nama) {
  if (!nama) return '?'
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = ['bg-indigo-900', 'bg-violet-600', 'bg-sky-700', 'bg-emerald-700', 'bg-rose-700']
function avatarColor(seed) {
  const i = (seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

// Level teknisi diturunkan dari pengalaman_tahun (bukan field terpisah di DB)
function levelTeknisi(tahun) {
  if (tahun >= 5) return 'Teknisi Senior'
  if (tahun < 2) return 'Teknisi Junior'
  return 'Teknisi'
}

const STATUS_LABEL = { tersedia: 'Tersedia', bertugas: 'Bertugas', libur: 'Libur' }
const STATUS_CLASS = {
  tersedia: 'bg-emerald-100 text-emerald-700',
  bertugas: 'bg-blue-100 text-blue-700',
  libur: 'bg-slate-100 text-slate-500',
}

function getMonthRangeISO() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
  return { start, end }
}

const FORM_KOSONG = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  spesialisasiText: '',
  pengalaman_tahun: '',
  status_kerja: 'tersedia',
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DataMekanik() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mekanikList, setMekanikList] = useState([])
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })

  async function loadData() {
    try {
      setError(null)
      const { start: monthStart, end: monthEnd } = getMonthRangeISO()

      const [mekanikRes, bookingRes] = await Promise.all([
        supabase
          .from('mekanik_detail')
          .select(`
            id, profile_id, spesialisasi, pengalaman_tahun, rating, status_kerja,
            profile:profile_id ( full_name, email, phone )
          `),
        supabase.from('booking').select('mekanik_id, status, tanggal').gte('tanggal', monthStart).lt('tanggal', monthEnd),
      ])

      if (mekanikRes.error) throw mekanikRes.error
      if (bookingRes.error) throw bookingRes.error

      // Hitung "selesai bulan ini" per mekanik dari data booking bulan berjalan
      const selesaiCount = new Map()
      for (const b of bookingRes.data ?? []) {
        if (b.status === 'selesai' && b.mekanik_id) {
          selesaiCount.set(b.mekanik_id, (selesaiCount.get(b.mekanik_id) || 0) + 1)
        }
      }

      const merged = (mekanikRes.data ?? []).map((m) => ({
        ...m,
        selesaiBulanIni: selesaiCount.get(m.profile_id) || 0,
      }))

      setMekanikList(merged)
    } catch (err) {
      console.error('Gagal memuat data mekanik:', err)
      setError(err.message || 'Gagal memuat data mekanik')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return mekanikList
    const q = search.trim().toLowerCase()
    return mekanikList.filter((m) => m.profile?.full_name?.toLowerCase().includes(q))
  }, [mekanikList, search])

  const stats = useMemo(() => {
    return {
      total: mekanikList.length,
      tersedia: mekanikList.filter((m) => m.status_kerja === 'tersedia').length,
      bertugas: mekanikList.filter((m) => m.status_kerja === 'bertugas').length,
      libur: mekanikList.filter((m) => m.status_kerja === 'libur').length,
    }
  }, [mekanikList])

  function bukaModal() {
    setForm(FORM_KOSONG)
    setNotice({ type: '', message: '' })
    setModalOpen(true)
  }

  async function handleTambahMekanik() {
    setNotice({ type: '', message: '' })
    if (!form.email || !form.password || !form.full_name) {
      setNotice({ type: 'error', message: 'Email, password, dan nama lengkap wajib diisi.' })
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Belum login')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mekanik`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            phone: form.phone,
            spesialisasi: form.spesialisasiText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            pengalaman_tahun: form.pengalaman_tahun,
            status_kerja: form.status_kerja,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan mekanik')

      setModalOpen(false)
      await loadData()
    } catch (err) {
      console.error('Gagal menambah mekanik:', err)
      setNotice({ type: 'error', message: err.message || 'Gagal menambahkan mekanik' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data mekanik...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Mekanik</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola mekanik yang bertugas di Kai-Po</p>
        </div>
        <button
          onClick={bukaModal}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Mekanik
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<ClipboardCheck size={16} />} iconBg="bg-slate-100 text-slate-600" label="Total Mekanik" value={stats.total} />
        <StatCard icon={<CheckCircle2 size={16} />} iconBg="bg-emerald-100 text-emerald-600" label="Tersedia" value={stats.tersedia} />
        <StatCard icon={<Clock size={16} />} iconBg="bg-blue-100 text-blue-600" label="Sedang Bertugas" value={stats.bertugas} />
        <StatCard icon={<CalendarOff size={16} />} iconBg="bg-slate-100 text-slate-500" label="Libur Hari Ini" value={stats.libur} />
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama mekanik..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
        />
      </div>

      {/* Grid kartu mekanik */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
          Tidak ada mekanik yang cocok dengan pencarian ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(m.profile?.full_name)}`}>
                    {inisial(m.profile?.full_name)}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{m.profile?.full_name ?? '-'}</p>
                    <p className="text-xs text-slate-400">{levelTeknisi(m.pengalaman_tahun ?? 0)}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLASS[m.status_kerja] || 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[m.status_kerja] || m.status_kerja}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 border-y border-slate-50 py-3 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Pengalaman</p>
                  <p className="text-sm font-semibold text-slate-800">{m.pengalaman_tahun ?? 0} tahun</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Selesai Bulan Ini</p>
                  <p className="text-sm font-semibold text-slate-800">{m.selesaiBulanIni}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Rating</p>
                  <p className="text-sm font-semibold text-slate-800">{Number(m.rating ?? 0).toFixed(1)}</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {(m.spesialisasi ?? []).length === 0 ? (
                  <span className="text-xs text-slate-300">Belum ada spesialisasi</span>
                ) : (
                  m.spesialisasi.map((s) => (
                    <span key={s} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-600">
                      {s}
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/admin/mekanik/${m.profile_id}/edit`}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </Link>
                <Link
                  to={`/admin/mekanik/${m.profile_id}`}
                  className="flex-1 rounded-lg bg-[#12123a] py-2 text-center text-xs font-semibold text-white hover:bg-[#1c1c52]"
                >
                  Lihat Profil
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Mekanik */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Tambah Mekanik</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {notice.message && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-600">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {notice.message}
              </div>
            )}

            <div className="space-y-3">
              <FieldFull label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Budi Santoso" />
              <FieldFull label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="budi@kaipo.com" />
              <FieldFull label="Password Sementara" type="text" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Minimal 6 karakter" />
              <FieldFull label="No. Telepon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="08xxxxxxxxxx" />
              <FieldFull
                label="Spesialisasi (pisahkan dengan koma)"
                value={form.spesialisasiText}
                onChange={(v) => setForm({ ...form, spesialisasiText: v })}
                placeholder="Mesin, Tune Up"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Pengalaman (tahun)</label>
                  <input
                    type="number"
                    value={form.pengalaman_tahun}
                    onChange={(e) => setForm({ ...form, pengalaman_tahun: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Status Kerja</label>
                  <select
                    value={form.status_kerja}
                    onChange={(e) => setForm({ ...form, status_kerja: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="tersedia">Tersedia</option>
                    <option value="bertugas">Bertugas</option>
                    <option value="libur">Libur</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleTambahMekanik}
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Tambah Mekanik'}
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

function FieldFull({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  )
}