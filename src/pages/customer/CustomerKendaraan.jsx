import { useEffect, useState } from 'react'
import { Car, Plus, Pencil, Trash2, Star, X, AlertCircle, CheckCircle2, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const FORM_KOSONG = {
  id: null,
  merek: '',
  model: '',
  plat_nomor: '',
  tahun: '',
  warna: '',
  transmisi: 'Manual',
  kondisi: 'Baik',
  foto_url: '',
}

function kondisiClass(kondisi) {
  if (kondisi === 'Baik') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (kondisi === 'Perlu Perhatian') return 'bg-amber-50 text-amber-700 ring-amber-100'
  if (kondisi === 'Bermasalah') return 'bg-rose-50 text-rose-700 ring-rose-100'
  return 'bg-slate-50 text-slate-600 ring-slate-100'
}

export default function CustomerKendaraan() {
  const [loading, setLoading] = useState(true)
  const [kendaraanList, setKendaraanList] = useState([])
  const [notice, setNotice] = useState({ type: '', message: '' })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('kendaraan')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setKendaraanList(data ?? [])
    } catch (err) {
      console.error('Gagal memuat kendaraan:', err)
      setNotice({ type: 'error', message: err.message || 'Gagal memuat data kendaraan' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function bukaModalTambah() {
    setForm(FORM_KOSONG)
    setFotoFile(null)
    setFotoPreview('')
    setNotice({ type: '', message: '' })
    setModalOpen(true)
  }

  function bukaModalEdit(k) {
    setForm({
      id: k.id,
      merek: k.merek ?? '',
      model: k.model ?? '',
      plat_nomor: k.plat_nomor ?? '',
      tahun: k.tahun ?? '',
      warna: k.warna ?? '',
      transmisi: k.transmisi ?? 'Manual',
      kondisi: k.kondisi ?? 'Baik',
      foto_url: k.foto_url ?? '',
    })
    setFotoFile(null)
    setFotoPreview(k.foto_url ?? '')
    setNotice({ type: '', message: '' })
    setModalOpen(true)
  }

  function handlePilihFoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function handleSimpan() {
    setNotice({ type: '', message: '' })
    if (!form.merek || !form.model || !form.plat_nomor) {
      setNotice({ type: 'error', message: 'Merek, model, dan plat nomor wajib diisi.' })
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let fotoUrl = form.foto_url
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('kendaraan-foto').upload(path, fotoFile)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('kendaraan-foto').getPublicUrl(path)
        fotoUrl = publicUrlData.publicUrl
      }

      const payload = {
        merek: form.merek,
        model: form.model,
        plat_nomor: form.plat_nomor,
        tahun: form.tahun ? Number(form.tahun) : null,
        warna: form.warna || null,
        transmisi: form.transmisi || null,
        kondisi: form.kondisi || null,
        foto_url: fotoUrl || null,
      }

      if (form.id) {
        const { error } = await supabase.from('kendaraan').update(payload).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('kendaraan').insert({
          ...payload,
          customer_id: user.id,
          is_default: kendaraanList.length === 0, // kendaraan pertama otomatis jadi default
        })
        if (error) throw error
      }

      setModalOpen(false)
      await load()
    } catch (err) {
      console.error('Gagal menyimpan kendaraan:', err)
      setNotice({ type: 'error', message: err.message || 'Gagal menyimpan kendaraan' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleHapus(k) {
    if (!confirm(`Hapus kendaraan ${k.merek} ${k.model} (${k.plat_nomor})?`)) return
    try {
      const { error } = await supabase.from('kendaraan').delete().eq('id', k.id)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('Gagal menghapus kendaraan:', err)
      alert('Gagal menghapus: ' + err.message)
    }
  }

  async function handleSetDefault(k) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Lepas default dari semua kendaraan customer ini, lalu set yang dipilih
      await supabase.from('kendaraan').update({ is_default: false }).eq('customer_id', user.id)
      const { error } = await supabase.from('kendaraan').update({ is_default: true }).eq('id', k.id)
      if (error) throw error
      await load()
    } catch (err) {
      console.error('Gagal mengubah kendaraan utama:', err)
      alert('Gagal mengubah kendaraan utama: ' + err.message)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat kendaraan...</div>
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kendaraan</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola daftar kendaraan Anda</p>
        </div>
        <button
          onClick={bukaModalTambah}
          className="flex items-center gap-2 rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
        >
          <Plus size={16} /> Tambah Kendaraan
        </button>
      </header>

      {notice.message && !modalOpen && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {notice.message}
        </div>
      )}

      {kendaraanList.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Car size={24} />
          </span>
          <p className="mb-4 text-sm text-slate-400">Belum ada kendaraan terdaftar.</p>
          <button
            onClick={bukaModalTambah}
            className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
          >
            Tambah Kendaraan Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kendaraanList.map((k) => (
            <div key={k.id} className="rounded-3xl bg-white p-3">
              <div className="relative">
                {k.foto_url ? (
                  <img src={k.foto_url} alt={k.merek} className="h-44 w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                    <Car size={34} />
                  </div>
                )}
                {k.is_default && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[#12123a] px-3 py-1 text-[11px] font-semibold text-white">
                    <Star size={11} fill="currentColor" /> Utama
                  </span>
                )}
              </div>

              <div className="px-3 pb-3 pt-4">
                <p className="text-base font-semibold text-slate-900">{k.merek} {k.model}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {k.plat_nomor}{k.tahun ? ` · ${k.tahun}` : ''}{k.warna ? ` · ${k.warna}` : ''}
                </p>

                <div className="my-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Kondisi</span>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${kondisiClass(k.kondisi)}`}>
                    {k.kondisi ?? '-'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => bukaModalEdit(k)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#12123a] py-2.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  {!k.is_default && (
                    <button
                      onClick={() => handleSetDefault(k)}
                      title="Jadikan kendaraan utama"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#12123a]"
                    >
                      <Star size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleHapus(k)}
                    title="Hapus kendaraan"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-rose-500 transition hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {form.id ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {notice.message && (
              <div className={`mb-4 flex items-start gap-2 rounded-2xl p-3 text-xs font-medium ${notice.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {notice.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
                <span>{notice.message}</span>
              </div>
            )}

            {/* Upload foto */}
            <label className="mb-5 flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-[#12123a]">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-slate-400">
                  <Camera size={22} />
                  <span className="text-xs">Unggah foto kendaraan</span>
                </span>
              )}
              <input type="file" accept="image/*" onChange={handlePilihFoto} className="hidden" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Merek" value={form.merek} onChange={(v) => setForm({ ...form, merek: v })} placeholder="Toyota" />
              <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} placeholder="Supra" />
              <Field label="Plat Nomor" value={form.plat_nomor} onChange={(v) => setForm({ ...form, plat_nomor: v })} placeholder="B 1234 XYZ" full />
              <Field label="Tahun" type="number" value={form.tahun} onChange={(v) => setForm({ ...form, tahun: v })} placeholder="2020" />
              <Field label="Warna" value={form.warna} onChange={(v) => setForm({ ...form, warna: v })} placeholder="Hitam" />

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Transmisi</label>
                <select
                  value={form.transmisi}
                  onChange={(e) => setForm({ ...form, transmisi: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Kondisi</label>
                <select
                  value={form.kondisi}
                  onChange={(e) => setForm({ ...form, kondisi: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
                >
                  <option value="Baik">Baik</option>
                  <option value="Perlu Perhatian">Perlu Perhatian</option>
                  <option value="Bermasalah">Bermasalah</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSimpan}
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-[#12123a] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Tambah Kendaraan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', full = false }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
      />
    </div>
  )
}