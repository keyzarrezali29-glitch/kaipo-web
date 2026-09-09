import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'tersedia', label: 'Tersedia' },
  { value: 'bertugas', label: 'Bertugas' },
  { value: 'libur', label: 'Libur' },
]

export default function EditMekanik() {
  const { id } = useParams() // ini profile_id mekanik
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const [detailId, setDetailId] = useState(null)
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [spesialisasi, setSpesialisasi] = useState('')
  const [pengalaman, setPengalaman] = useState(0)
  const [statusKerja, setStatusKerja] = useState('tersedia')

  useEffect(() => {
    async function load() {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', id)
          .single()
        if (profileError) throw profileError
        setNama(profile.full_name ?? '')
        setEmail(profile.email ?? '')
        setPhone(profile.phone ?? '')

        const { data: detail, error: detailError } = await supabase
          .from('mekanik_detail')
          .select('*')
          .eq('profile_id', id)
          .single()
        if (detailError) throw detailError
        setDetailId(detail.id)
        setSpesialisasi((detail.spesialisasi ?? []).join(', '))
        setPengalaman(detail.pengalaman_tahun ?? 0)
        setStatusKerja(detail.status_kerja ?? 'tersedia')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: nama, phone })
        .eq('id', id)
      if (profileError) throw profileError

      const { error: detailError } = await supabase
        .from('mekanik_detail')
        .update({
          spesialisasi: spesialisasi.split(',').map((s) => s.trim()).filter(Boolean),
          pengalaman_tahun: Number(pengalaman),
          status_kerja: statusKerja,
        })
        .eq('id', detailId)
      if (detailError) throw detailError

      setSuccess(true)
      setTimeout(() => navigate('/admin/mekanik'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data mekanik...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <button
        onClick={() => navigate('/admin/mekanik')}
        className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} /> Kembali ke Data Mekanik
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Mekanik</h1>
        <p className="mt-1 text-sm text-slate-400">Ubah data dan status kerja mekanik</p>
      </header>

      {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama</label>
            <input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
            <input
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nomor Telepon</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812xxxxxxx"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Spesialisasi (pisahkan dengan koma)</label>
            <input
              value={spesialisasi}
              onChange={(e) => setSpesialisasi(e.target.value)}
              placeholder="Mesin, Tune Up, Rem & Kaki-Kaki"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Pengalaman (tahun)</label>
              <input
                type="number"
                min={0}
                value={pengalaman}
                onChange={(e) => setPengalaman(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Status Kerja</label>
              <select
                value={statusKerja}
                onChange={(e) => setStatusKerja(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0f1b4c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          {success && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 size={14} /> Tersimpan, kembali ke daftar...
            </span>
          )}
        </div>
      </form>
    </div>
  )
}