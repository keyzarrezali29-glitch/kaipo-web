import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, X, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function MerekKendaraan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [merekList, setMerekList] = useState([])
  const [jumlahPerMerek, setJumlahPerMerek] = useState(new Map())
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [nama, setNama] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function loadData() {
    try {
      setError(null)
      const [merekRes, kendaraanRes] = await Promise.all([
        supabase.from('merek_kendaraan').select('id, nama, is_active, created_at').order('nama'),
        supabase.from('kendaraan').select('merek'),
      ])
      if (merekRes.error) throw merekRes.error
      if (kendaraanRes.error) throw kendaraanRes.error

      const hitung = new Map()
      for (const k of kendaraanRes.data ?? []) {
        const key = (k.merek || '').trim().toLowerCase()
        if (key) hitung.set(key, (hitung.get(key) || 0) + 1)
      }

      setMerekList(merekRes.data ?? [])
      setJumlahPerMerek(hitung)
    } catch (err) {
      console.error('Gagal memuat merek kendaraan:', err)
      setError(err.message || 'Gagal memuat merek kendaraan')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  function openTambah() {
    setEditingId(null)
    setNama('')
    setFormError('')
    setShowModal(true)
  }

  function openEdit(m) {
    setEditingId(m.id)
    setNama(m.nama)
    setFormError('')
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const namaBersih = nama.trim()
    if (!namaBersih) {
      setFormError('Nama merek wajib diisi.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error: updateError } = await supabase.from('merek_kendaraan').update({ nama: namaBersih }).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('merek_kendaraan').insert({ nama: namaBersih })
        if (insertError) throw insertError
      }
      setShowModal(false)
      setEditingId(null)
      setNama('')
      await loadData()
    } catch (err) {
      console.error('Gagal menyimpan merek:', err)
      if (err.code === '23505') {
        setFormError('Merek ini sudah ada di daftar.')
      } else {
        setFormError(err.message || 'Gagal menyimpan merek.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(m) {
    setTogglingId(m.id)
    try {
      const { error: updateError } = await supabase
        .from('merek_kendaraan')
        .update({ is_active: !m.is_active })
        .eq('id', m.id)
      if (updateError) throw updateError
      setMerekList((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x)))
    } catch (err) {
      console.error('Gagal ubah status merek:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(m) {
    const jumlah = jumlahPerMerek.get(m.nama.trim().toLowerCase()) || 0
    const pesan =
      jumlah > 0
        ? `Hapus merek "${m.nama}"? Sudah ada ${jumlah} kendaraan dengan merek ini. Datanya tetap ada, tapi customer tidak bisa menambah kendaraan dengan merek ini lagi. (Atau nonaktifkan saja kalau cuma sementara.)`
        : `Hapus merek "${m.nama}"?`
    if (!window.confirm(pesan)) return

    setDeletingId(m.id)
    try {
      const { error: deleteError } = await supabase.from('merek_kendaraan').delete().eq('id', m.id)
      if (deleteError) throw deleteError
      setMerekList((prev) => prev.filter((x) => x.id !== m.id))
    } catch (err) {
      console.error('Gagal hapus merek:', err)
      alert('Gagal hapus merek: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return merekList
    const q = search.trim().toLowerCase()
    return merekList.filter((m) => m.nama.toLowerCase().includes(q))
  }, [merekList, search])

  const totalAktif = merekList.filter((m) => m.is_active).length

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat merek kendaraan...</div>
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Merek Kendaraan</h1>
          <p className="mt-1 text-sm text-slate-400">
            Atur merek mobil yang dilayani bengkel. Customer hanya bisa memilih dari daftar ini.
          </p>
        </div>
        <button
          onClick={openTambah}
          className="flex items-center gap-2 rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
        >
          <Plus size={16} /> Tambah Merek
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Ringkasan + cari */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 ring-1 ring-slate-200">
          <span className="font-bold text-slate-900">{totalAktif}</span> merek aktif dari{' '}
          <span className="font-bold text-slate-900">{merekList.length}</span>
        </span>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari merek..."
            className="w-64 rounded-full bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-3xl bg-white px-4 py-12 text-center text-sm text-slate-400">
          {merekList.length === 0
            ? 'Belum ada merek. Klik "Tambah Merek" untuk mulai.'
            : 'Tidak ada merek yang cocok dengan pencarian ini.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const jumlah = jumlahPerMerek.get(m.nama.trim().toLowerCase()) || 0
            return (
              <div key={m.id} className={`rounded-3xl bg-white p-5 ${m.is_active ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#12123a] text-lg font-bold text-white">
                      {m.nama.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{m.nama}</p>
                      <p className="text-xs text-slate-400">{jumlah} kendaraan terdaftar</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(m)}
                    disabled={togglingId === m.id}
                    title="Klik buat ubah status"
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset transition disabled:opacity-40 ${
                      m.is_active
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-[#12123a] hover:text-[#12123a]"
                  >
                    <Pencil size={13} /> Ubah nama
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    disabled={deletingId === m.id}
                    title="Hapus merek"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-rose-500 transition hover:bg-rose-50 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal tambah / ubah nama */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Ubah Nama Merek' : 'Tambah Merek'}</h3>
              <button
                onClick={() => { setShowModal(false); setEditingId(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama Merek *</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
                  placeholder="Contoh: Toyota"
                />
                {editingId && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Mengganti nama tidak mengubah kendaraan yang sudah terdaftar dengan nama lama.
                  </p>
                )}
              </div>

              {formError && (
                <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-xs text-rose-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /> {formError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                  className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-[#12123a] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}