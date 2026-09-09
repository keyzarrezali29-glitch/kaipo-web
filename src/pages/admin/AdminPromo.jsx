import { useEffect, useMemo, useState } from 'react'
import { Search, Tag, X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDiskon(p) {
  return p.tipe_diskon === 'persen' ? `${p.nilai}%` : formatRupiah(p.nilai)
}
function sudahBerakhir(tanggalStr) {
  if (!tanggalStr) return false
  return new Date(tanggalStr) < new Date(new Date().toDateString())
}

const EMPTY_FORM = {
  kode: '',
  judul: '',
  deskripsi: '',
  tipe_diskon: 'persen',
  nilai: '',
  min_transaksi: '',
  berlaku_dari: '',
  berlaku_sampai: '',
}

export default function AdminPromo() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [promoList, setPromoList] = useState([])
  const [statusFilter, setStatusFilter] = useState('semua') // 'semua' | 'aktif' | 'nonaktif'
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  async function loadData() {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('promo')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      setPromoList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat data promo:', err)
      setError(err.message || 'Gagal memuat data promo')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function toggleStatus(promo) {
    setTogglingId(promo.id)
    try {
      const { error: updateError } = await supabase
        .from('promo')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id)
      if (updateError) throw updateError
      setPromoList((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !p.is_active } : p)))
    } catch (err) {
      console.error('Gagal ubah status:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  function openTambah() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      berlaku_dari: new Date().toISOString().slice(0, 10),
    })
    setFormError('')
    setShowModal(true)
  }

  function openEdit(promo) {
    setEditingId(promo.id)
    setForm({
      kode: promo.kode || '',
      judul: promo.judul || '',
      deskripsi: promo.deskripsi || '',
      tipe_diskon: promo.tipe_diskon || 'persen',
      nilai: promo.nilai ?? '',
      min_transaksi: promo.min_transaksi ?? '',
      berlaku_dari: promo.berlaku_dari || '',
      berlaku_sampai: promo.berlaku_sampai || '',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.kode.trim() || !form.judul.trim() || !form.nilai || !form.berlaku_sampai) {
      setFormError('Kode, judul, nilai diskon, dan tanggal berakhir wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        kode: form.kode.trim().toUpperCase(),
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim() || null,
        tipe_diskon: form.tipe_diskon,
        nilai: Number(form.nilai),
        min_transaksi: form.min_transaksi ? Number(form.min_transaksi) : 0,
        berlaku_dari: form.berlaku_dari || new Date().toISOString().slice(0, 10),
        berlaku_sampai: form.berlaku_sampai,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('promo').update(payload).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('promo').insert({ ...payload, is_active: true })
        if (insertError) throw insertError
      }

      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (err) {
      console.error('Gagal menyimpan promo:', err)
      if (err.code === '23505') {
        setFormError('Kode promo ini sudah dipakai, coba kode lain.')
      } else {
        setFormError(err.message || 'Gagal menyimpan promo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(promo) {
    if (!window.confirm(`Hapus promo "${promo.judul}" (${promo.kode})? Tindakan ini nggak bisa dibatalkan.`)) return
    setDeletingId(promo.id)
    try {
      const { error: deleteError } = await supabase.from('promo').delete().eq('id', promo.id)
      if (deleteError) throw deleteError
      setPromoList((prev) => prev.filter((p) => p.id !== promo.id))
    } catch (err) {
      console.error('Gagal hapus promo:', err)
      alert('Gagal hapus promo: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    let rows = [...promoList]
    if (statusFilter === 'aktif') rows = rows.filter((p) => p.is_active)
    if (statusFilter === 'nonaktif') rows = rows.filter((p) => !p.is_active)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((p) => p.judul?.toLowerCase().includes(q) || p.kode?.toLowerCase().includes(q))
    }
    return rows
  }, [promoList, statusFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data promo...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola kupon dan diskon untuk customer Kai-Po</p>
        </div>
        <button
          onClick={openTambah}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Promo
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
            placeholder="Cari judul atau kode promo..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Grid kartu promo */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-slate-400 shadow-sm">
          Tidak ada promo yang cocok dengan filter ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const expired = sudahBerakhir(p.berlaku_sampai)
            return (
              <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Tag size={16} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleStatus(p)}
                      disabled={togglingId === p.id}
                      title="Klik buat ubah status"
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                        p.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      title="Hapus promo"
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xl font-extrabold text-indigo-600">{formatDiskon(p)}</p>
                <p className="mb-1 text-sm font-semibold text-slate-900">{p.judul}</p>
                <p className="mb-3 text-xs text-slate-400">{p.deskripsi || 'Belum ada deskripsi.'}</p>

                <div className="mb-3 flex items-center justify-between border-t border-slate-50 pt-3 text-xs">
                  <span className="text-slate-400">Kode</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-700">{p.kode}</span>
                </div>
                {p.min_transaksi > 0 && (
                  <p className="mb-1 text-xs text-slate-400">Min. transaksi {formatRupiah(p.min_transaksi)}</p>
                )}
                <p className={`mb-4 text-xs ${expired ? 'font-semibold text-rose-500' : 'text-slate-400'}`}>
                  {expired ? 'Sudah berakhir' : 'Berlaku sampai'} {formatTanggal(p.berlaku_sampai)}
                </p>

                <button
                  onClick={() => openEdit(p)}
                  className="w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal tambah/edit promo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Promo' : 'Tambah Promo'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Kode Promo *</label>
                  <input
                    type="text"
                    value={form.kode}
                    onChange={(e) => setForm((f) => ({ ...f, kode: e.target.value.toUpperCase() }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-[#2e4bd6]"
                    placeholder="KAIPO10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Tipe Diskon</label>
                  <select
                    value={form.tipe_diskon}
                    onChange={(e) => setForm((f) => ({ ...f, tipe_diskon: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  >
                    <option value="persen">Persen (%)</option>
                    <option value="nominal">Nominal (Rp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Judul Promo *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Diskon Spesial"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Deskripsi</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  placeholder="Diskon untuk semua jenis servis"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Nilai {form.tipe_diskon === 'persen' ? '(%)' : '(Rp)'} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.nilai}
                    onChange={(e) => setForm((f) => ({ ...f, nilai: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder={form.tipe_diskon === 'persen' ? '10' : '50000'}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Min. Transaksi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_transaksi}
                    onChange={(e) => setForm((f) => ({ ...f, min_transaksi: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Berlaku Dari</label>
                  <input
                    type="date"
                    value={form.berlaku_dari}
                    onChange={(e) => setForm((f) => ({ ...f, berlaku_dari: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Berlaku Sampai *</label>
                  <input
                    type="date"
                    value={form.berlaku_sampai}
                    onChange={(e) => setForm((f) => ({ ...f, berlaku_sampai: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  />
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