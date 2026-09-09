import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Wrench, Settings2, Zap, Disc3, Droplet, Car, Wind, Sparkles, X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ICON_MAP = {
  wrench: Wrench,
  engine: Settings2,
  bolt: Zap,
  wheel: Disc3,
  oil: Droplet,
  car: Car,
  aircon: Wind,
  sparkles: Sparkles,
}
const ICON_OPTIONS = Object.keys(ICON_MAP)

function IconFor({ name, size = 16 }) {
  const Comp = ICON_MAP[name] || Wrench
  return <Comp size={size} />
}

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`
}

const EMPTY_FORM = { nama: '', deskripsi: '', harga: '', kategori: '', estimasi_waktu: '', icon: 'wrench' }

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DataServis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [layananList, setLayananList] = useState([])

  const [kategoriFilter, setKategoriFilter] = useState('semua')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = mode tambah, isi = mode edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  async function loadData() {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('layanan')
        .select('id, nama, deskripsi, harga, kategori, estimasi_waktu, icon, is_active')
        .order('nama')
      if (fetchError) throw fetchError
      setLayananList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat data servis:', err)
      setError(err.message || 'Gagal memuat data servis')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function toggleStatus(layanan) {
    setTogglingId(layanan.id)
    try {
      const { error: updateError } = await supabase
        .from('layanan')
        .update({ is_active: !layanan.is_active })
        .eq('id', layanan.id)
      if (updateError) throw updateError
      setLayananList((prev) => prev.map((l) => (l.id === layanan.id ? { ...l, is_active: !l.is_active } : l)))
    } catch (err) {
      console.error('Gagal ubah status:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  function openTambah() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(layanan) {
    setEditingId(layanan.id)
    setForm({
      nama: layanan.nama || '',
      deskripsi: layanan.deskripsi || '',
      harga: layanan.harga ?? '',
      kategori: layanan.kategori || '',
      estimasi_waktu: layanan.estimasi_waktu || '',
      icon: layanan.icon || 'wrench',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmitLayanan(e) {
    e.preventDefault()
    setFormError('')
    if (!form.nama.trim() || !form.harga) {
      setFormError('Nama dan harga wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nama: form.nama.trim(),
        deskripsi: form.deskripsi.trim() || null,
        harga: Number(form.harga),
        kategori: form.kategori.trim() || null,
        estimasi_waktu: form.estimasi_waktu.trim() || null,
        icon: form.icon,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('layanan').update(payload).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('layanan').insert(payload)
        if (insertError) throw insertError
      }

      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (err) {
      console.error('Gagal menyimpan layanan:', err)
      setFormError(err.message || 'Gagal menyimpan layanan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(layanan) {
    const konfirmasi = window.confirm(`Hapus layanan "${layanan.nama}"? Tindakan ini nggak bisa dibatalkan.`)
    if (!konfirmasi) return

    setDeletingId(layanan.id)
    try {
      const { error: deleteError } = await supabase.from('layanan').delete().eq('id', layanan.id)
      if (deleteError) throw deleteError
      setLayananList((prev) => prev.filter((l) => l.id !== layanan.id))
    } catch (err) {
      console.error('Gagal hapus layanan:', err)
      // Kalau layanan ini masih dipakai di booking lama, FK constraint bakal nolak delete-nya
      if (err.code === '23503') {
        alert(
          `Layanan "${layanan.nama}" nggak bisa dihapus karena masih ada riwayat booking yang pakai layanan ini. Nonaktifkan aja (klik badge status) daripada dihapus, biar riwayat booking lama tetap utuh.`
        )
      } else {
        alert('Gagal hapus layanan: ' + err.message)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const kategoriOptions = useMemo(() => {
    return [...new Set(layananList.map((l) => l.kategori).filter(Boolean))].sort()
  }, [layananList])

  const filtered = useMemo(() => {
    let rows = [...layananList]
    if (kategoriFilter !== 'semua') rows = rows.filter((l) => l.kategori === kategoriFilter)
    if (statusFilter === 'aktif') rows = rows.filter((l) => l.is_active)
    if (statusFilter === 'nonaktif') rows = rows.filter((l) => !l.is_active)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((l) => l.nama?.toLowerCase().includes(q))
    }
    return rows
  }, [layananList, kategoriFilter, statusFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data servis...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Servis</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola daftar jenis layanan dan harga yang tersedia</p>
        </div>
        <button
          onClick={openTambah}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Layanan
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Kategori</option>
          {kategoriOptions.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama layanan..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Grid kartu layanan */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
          Tidak ada layanan yang cocok dengan filter ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <div key={l.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <IconFor name={l.icon} />
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleStatus(l)}
                    disabled={togglingId === l.id}
                    title="Klik buat ubah status"
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                      l.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {l.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                  <button
                    onClick={() => handleDelete(l)}
                    disabled={deletingId === l.id}
                    title="Hapus layanan"
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="mb-1 font-semibold text-slate-900">{l.nama}</p>
              <p className="mb-4 text-xs text-slate-400">{l.deskripsi || 'Belum ada deskripsi.'}</p>

              <div className="mb-4 flex items-center justify-between border-t border-slate-50 pt-3">
                <span className="text-xs text-slate-400">Harga</span>
                <span className="font-bold text-slate-900">{formatRupiah(l.harga)}</span>
              </div>
              <p className="-mt-3 mb-4 text-xs text-slate-400">Estimasi waktu: {l.estimasi_waktu || '-'}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(l)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <Link
                  to={`/admin/servis/${l.id}`}
                  className="flex-1 rounded-lg bg-[#12123a] py-2 text-center text-xs font-semibold text-white hover:bg-[#1c1c52]"
                >
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal tambah layanan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Layanan' : 'Tambah Layanan'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitLayanan} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nama Layanan *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Contoh: Servis AC"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Deskripsi singkat layanan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Harga (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.harga}
                    onChange={(e) => setForm((f) => ({ ...f, harga: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="250000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kategori</label>
                  <input
                    type="text"
                    value={form.kategori}
                    onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="Perawatan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Estimasi Waktu</label>
                  <input
                    type="text"
                    value={form.estimasi_waktu}
                    onChange={(e) => setForm((f) => ({ ...f, estimasi_waktu: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="1-2 jam"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Ikon</label>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#12123a] py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}