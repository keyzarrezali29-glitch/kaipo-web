import { useEffect, useMemo, useState } from 'react'
import { Search, Package, AlertTriangle, Wallet, Boxes, X, Pencil, Trash2, ImagePlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PER_PAGE = 6
const STOK_MENIPIS_THRESHOLD = 5

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`
}

const EMPTY_FORM = { nama: '', deskripsi: '', harga: '', stok: '', kategori: '', foto_url: '' }

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function ProdukSparepart() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [produkList, setProdukList] = useState([])

  const [kategoriFilter, setKategoriFilter] = useState('semua')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [fotoFile, setFotoFile] = useState(null) // File asli yang mau diupload
  const [fotoPreview, setFotoPreview] = useState('') // buat preview di modal (bisa foto lama atau foto baru)
  const [uploading, setUploading] = useState(false)

  async function loadData() {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('produk')
        .select('id, nama, deskripsi, harga, stok, kategori, foto_url, is_active')
        .order('nama')
      if (fetchError) throw fetchError
      setProdukList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat data produk:', err)
      setError(err.message || 'Gagal memuat data produk')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function toggleStatus(produk) {
    setTogglingId(produk.id)
    try {
      const { error: updateError } = await supabase
        .from('produk')
        .update({ is_active: !produk.is_active })
        .eq('id', produk.id)
      if (updateError) throw updateError
      setProdukList((prev) => prev.map((p) => (p.id === produk.id ? { ...p, is_active: !p.is_active } : p)))
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
    setFotoFile(null)
    setFotoPreview('')
    setFormError('')
    setShowModal(true)
  }

  function openEdit(produk) {
    setEditingId(produk.id)
    setForm({
      nama: produk.nama || '',
      deskripsi: produk.deskripsi || '',
      harga: produk.harga ?? '',
      stok: produk.stok ?? '',
      kategori: produk.kategori || '',
      foto_url: produk.foto_url || '',
    })
    setFotoFile(null)
    setFotoPreview(produk.foto_url || '')
    setFormError('')
    setShowModal(true)
  }

  function handlePilihFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.nama.trim() || form.harga === '' || form.stok === '') {
      setFormError('Nama, harga, dan stok wajib diisi.')
      return
    }
    setSaving(true)
    try {
      let fotoUrl = form.foto_url || null

      // Kalau ada file baru dipilih, upload dulu ke Supabase Storage
      if (fotoFile) {
        setUploading(true)
        const ext = fotoFile.name.split('.').pop()
        const path = `produk/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('produk-foto').upload(path, fotoFile)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('produk-foto').getPublicUrl(path)
        fotoUrl = publicUrlData.publicUrl
        setUploading(false)
      }

      const payload = {
        nama: form.nama.trim(),
        deskripsi: form.deskripsi.trim() || null,
        harga: Number(form.harga),
        stok: Number(form.stok),
        kategori: form.kategori.trim() || null,
        foto_url: fotoUrl,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('produk').update(payload).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('produk').insert(payload)
        if (insertError) throw insertError
      }

      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setFotoFile(null)
      setFotoPreview('')
      await loadData()
    } catch (err) {
      console.error('Gagal menyimpan produk:', err)
      setFormError(err.message || 'Gagal menyimpan produk.')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  async function handleDelete(produk) {
    const konfirmasi = window.confirm(`Hapus produk "${produk.nama}"? Tindakan ini nggak bisa dibatalkan.`)
    if (!konfirmasi) return

    setDeletingId(produk.id)
    try {
      const { error: deleteError } = await supabase.from('produk').delete().eq('id', produk.id)
      if (deleteError) throw deleteError
      setProdukList((prev) => prev.filter((p) => p.id !== produk.id))
    } catch (err) {
      console.error('Gagal hapus produk:', err)
      if (err.code === '23503') {
        alert(
          `Produk "${produk.nama}" nggak bisa dihapus karena masih ada riwayat transaksi/keranjang/pemakaian servis yang pakai produk ini. Nonaktifkan aja (klik badge status) daripada dihapus.`
        )
      } else {
        alert('Gagal hapus produk: ' + err.message)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const kategoriOptions = useMemo(() => {
    return [...new Set(produkList.map((p) => p.kategori).filter(Boolean))].sort()
  }, [produkList])

  const stats = useMemo(() => {
    return {
      total: produkList.length,
      stokMenipis: produkList.filter((p) => p.stok <= STOK_MENIPIS_THRESHOLD).length,
      nonaktif: produkList.filter((p) => !p.is_active).length,
      nilaiInventori: produkList.reduce((sum, p) => sum + Number(p.harga || 0) * Number(p.stok || 0), 0),
    }
  }, [produkList])

  const filtered = useMemo(() => {
    let rows = [...produkList]
    if (kategoriFilter !== 'semua') rows = rows.filter((p) => p.kategori === kategoriFilter)
    if (statusFilter === 'aktif') rows = rows.filter((p) => p.is_active)
    if (statusFilter === 'nonaktif') rows = rows.filter((p) => !p.is_active)
    if (statusFilter === 'menipis') rows = rows.filter((p) => p.stok <= STOK_MENIPIS_THRESHOLD)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((p) => p.nama?.toLowerCase().includes(q))
    }
    return rows
  }, [produkList, kategoriFilter, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [kategoriFilter, statusFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data produk...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produk & Sparepart</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola stok produk dan sparepart yang dijual di Kai-Po</p>
        </div>
        <button
          onClick={openTambah}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Produk
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Package size={16} />} iconBg="bg-indigo-100 text-indigo-600" label="Total Produk" value={stats.total} />
        <StatCard icon={<AlertTriangle size={16} />} iconBg="bg-rose-100 text-rose-600" label={`Stok Menipis (≤${STOK_MENIPIS_THRESHOLD})`} value={stats.stokMenipis} />
        <StatCard icon={<Boxes size={16} />} iconBg="bg-slate-100 text-slate-500" label="Nonaktif" value={stats.nonaktif} />
        <StatCard icon={<Wallet size={16} />} iconBg="bg-emerald-100 text-emerald-600" label="Nilai Inventori" value={formatRupiah(stats.nilaiInventori)} />
      </div>

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
          <option value="menipis">Stok Menipis</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {paginated.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada produk yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Produk</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Harga</th>
                  <th className="px-4 py-3 font-medium">Stok</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nama} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <Package size={16} />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{p.nama}</p>
                          <p className="max-w-xs truncate text-xs text-slate-400">{p.deskripsi || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.kategori || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatRupiah(p.harga)}</td>
                    <td className="px-4 py-3">
                      <span className={p.stok <= STOK_MENIPIS_THRESHOLD ? 'font-semibold text-rose-600' : 'text-slate-700'}>
                        {p.stok} unit
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(p)}
                        disabled={togglingId === p.id}
                        title="Klik buat ubah status"
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                          p.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')} produk
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

      {/* Modal tambah/edit produk */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Produk' : 'Tambah Produk'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nama Produk *</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Contoh: Oli Mesin 10W-40"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Deskripsi singkat produk"
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
                    placeholder="85000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Stok *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stok}
                    onChange={(e) => setForm((f) => ({ ...f, stok: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Kategori</label>
                <input
                  type="text"
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Sparepart / Aksesoris"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Foto Produk</label>
                <label
                  htmlFor="foto-produk-input"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500 hover:border-[#2e4bd6] hover:bg-slate-50"
                >
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                      <ImagePlus size={18} />
                    </span>
                  )}
                  <span>{fotoFile ? fotoFile.name : 'Klik buat pilih gambar dari komputer...'}</span>
                </label>
                <input
                  id="foto-produk-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePilihFoto}
                  className="hidden"
                />
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
                  {uploading ? 'Mengupload foto...' : saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
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