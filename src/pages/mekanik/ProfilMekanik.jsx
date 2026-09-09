import { useEffect, useState } from 'react'
import { CheckCircle2, User, Wrench, CalendarClock, Activity, Lock, Star, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'tersedia', label: 'Tersedia', className: 'bg-emerald-100 text-emerald-700' },
  { value: 'bertugas', label: 'Bertugas', className: 'bg-blue-100 text-blue-700' },
  { value: 'libur', label: 'Libur', className: 'bg-slate-100 text-slate-600' },
]

function inisial(nama) {
  if (!nama) return '?'
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function Profil() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const [userId, setUserId] = useState(null)
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [spesialisasi, setSpesialisasi] = useState('')
  const [pengalaman, setPengalaman] = useState(0)
  const [rating, setRating] = useState(0)
  const [statusKerja, setStatusKerja] = useState('tersedia')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Belum login')
        setUserId(user.id)

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .single()
        if (profileError) throw profileError
        setNama(profile.full_name ?? '')
        setEmail(profile.email ?? '')
        setAvatarUrl(profile.avatar_url ?? '')

        const { data: detail, error: detailError } = await supabase
          .from('mekanik_detail')
          .select('*')
          .eq('profile_id', user.id)
          .single()
        if (detailError) throw detailError

        setDetailId(detail.id)
        setSpesialisasi((detail.spesialisasi ?? []).join(', '))
        setPengalaman(detail.pengalaman_tahun ?? 0)
        setRating(detail.rating ?? 0)
        setStatusKerja(detail.status_kerja ?? 'tersedia')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handlePilihAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSimpan(e) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    try {
      let fotoUrl = avatarUrl

      if (avatarFile) {
        setUploadingAvatar(true)
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        fotoUrl = publicUrlData.publicUrl
        setUploadingAvatar(false)
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: nama, avatar_url: fotoUrl })
        .eq('id', userId)
      if (profileError) throw profileError

      const { error: detailError } = await supabase
        .from('mekanik_detail')
        .update({
          spesialisasi: spesialisasi.split(',').map((s) => s.trim()).filter(Boolean),
          status_kerja: statusKerja,
        })
        .eq('id', detailId)
      if (detailError) throw detailError

      if (passwordBaru) {
        if (passwordBaru !== konfirmasiPassword) throw new Error('Konfirmasi password tidak cocok.')
        if (passwordBaru.length < 6) throw new Error('Password minimal 6 karakter.')
        const { error: passError } = await supabase.auth.updateUser({ password: passwordBaru })
        if (passError) throw passError
      }

      setAvatarUrl(fotoUrl)
      setAvatarFile(null)
      setPasswordBaru('')
      setKonfirmasiPassword('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat profil...</div>
  }

  const statusAktif = STATUS_OPTIONS.find((s) => s.value === statusKerja)
  const fotoTampil = avatarPreview || avatarUrl

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-400">Kelola data diri dan status kerja Anda</p>
      </header>

      {error && <div className="mb-4 max-w-3xl rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      <form onSubmit={handleSimpan} className="grid max-w-3xl grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Kartu ringkasan kiri */}
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm lg:col-span-1">
          <label htmlFor="avatar-input" className="group relative mx-auto mb-4 block h-24 w-24 cursor-pointer">
            {fotoTampil ? (
              <img src={fotoTampil} alt={nama} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-700">
                {inisial(nama)}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <Camera size={20} />
            </span>
          </label>
          <input id="avatar-input" type="file" accept="image/*" onChange={handlePilihAvatar} className="hidden" />

          <p className="font-semibold text-slate-900">{nama || 'Belum ada nama'}</p>
          <p className="mb-3 text-xs text-slate-400">{email}</p>

          <div className="mb-4 flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
            ))}
            <span className="ml-1 text-xs font-medium text-slate-500">{Number(rating).toFixed(1)}</span>
          </div>

          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusAktif?.className}`}>
            {statusAktif?.label}
          </span>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <CalendarClock size={13} />
            {pengalaman} tahun pengalaman
          </div>
        </div>

        {/* Form kanan */}
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nama</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap"
                  required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Spesialisasi</label>
              <div className="relative">
                <Wrench size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={spesialisasi}
                  onChange={(e) => setSpesialisasi(e.target.value)}
                  placeholder="Mesin, Tune Up, Rem & Kaki-Kaki"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Pisahkan tiap keahlian dengan koma</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Pengalaman (tahun)</label>
                <div className="relative">
                  <CalendarClock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    value={pengalaman}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-400"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Diatur oleh admin</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Status Kerja</label>
                <div className="relative">
                  <Activity size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={statusKerja}
                    onChange={(e) => setStatusKerja(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Lock size={13} /> Ganti Password (opsional)
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  placeholder="Password baru (min. 6 karakter)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="password"
                  value={konfirmasiPassword}
                  onChange={(e) => setKonfirmasiPassword(e.target.value)}
                  placeholder="Konfirmasi password baru"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#0f1b4c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {uploadingAvatar ? 'Mengupload foto...' : saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            {success && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={14} /> Tersimpan
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}