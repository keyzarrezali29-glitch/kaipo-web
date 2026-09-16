import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function EditCustomer() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })
  const [form, setForm] = useState({ full_name: '', phone: '', is_active: true })

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, phone, is_active')
          .eq('id', id)
          .single()
        if (error) throw error
        setForm({
          full_name: data.full_name ?? '',
          phone: data.phone ?? '',
          is_active: data.is_active,
        })
      } catch (err) {
        setNotice({ type: 'error', message: err.message || 'Gagal memuat data customer' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSimpan() {
    setNotice({ type: '', message: '' })
    if (!form.full_name.trim()) {
      setNotice({ type: 'error', message: 'Nama lengkap wajib diisi.' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name, phone: form.phone, is_active: form.is_active })
        .eq('id', id)
      if (error) throw error
      navigate(`/admin/customer/${id}`)
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Gagal menyimpan perubahan' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data customer...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Kembali
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
        <p className="mt-1 text-sm text-slate-400">Perbarui data profil customer</p>
      </header>

      <div className="max-w-lg rounded-2xl bg-white p-6 shadow-sm">
        {notice.message && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-600">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {notice.message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Nama Lengkap</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">No. Telepon</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <select
              value={form.is_active ? 'aktif' : 'nonaktif'}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === 'aktif' })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSimpan}
            disabled={saving}
            className="flex-1 rounded-lg bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}