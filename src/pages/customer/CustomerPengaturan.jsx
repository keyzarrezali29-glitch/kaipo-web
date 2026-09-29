import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { User, Camera, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

function Notice({ type, message }) {
  if (!message) return null
  const error = type === 'error'
  return (
    <div className={`mb-5 flex items-start gap-2 rounded-2xl p-3 text-xs font-medium ${error ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
      {error ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}

export default function CustomerPengaturan() {
  // Disediakan CustomerLayout.jsx lewat <Outlet context={{ refreshProfil }} />.
  // Kalau halaman ini dibuka di luar CustomerLayout, refreshProfil bakal undefined,
  // jadi dipanggil pakai optional chaining biar gak error.
  const { refreshProfil } = useOutletContext() ?? {}

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  // Form profil
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [savingProfil, setSavingProfil] = useState(false)
  const [noticeProfil, setNoticeProfil] = useState({ type: '', message: '' })

  // Form password
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [noticePassword, setNoticePassword] = useState({ type: '', message: '' })

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (error) throw error
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPhone(data.phone ?? '')
        setAvatarPreview(data.avatar_url ?? '')
      } catch (err) {
        console.error('Gagal memuat profil:', err)
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

  async function handleSimpanProfil() {
    setNoticeProfil({ type: '', message: '' })
    if (!fullName.trim()) {
      setNoticeProfil({ type: 'error', message: 'Nama lengkap tidak boleh kosong.' })
      return
    }

    setSavingProfil(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        // Tambahin timestamp biar browser gak nampilin foto lama dari cache
        avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, avatar_url: avatarUrl })
        .eq('id', user.id)
      if (error) throw error

      setProfile((p) => ({ ...p, full_name: fullName, phone, avatar_url: avatarUrl }))
      setAvatarFile(null)
      setNoticeProfil({ type: 'success', message: 'Profil berhasil diperbarui.' })

      // Suruh CustomerLayout.jsx muat ulang profil biar avatar di pojok kanan atas ikut berubah
      refreshProfil?.()
    } catch (err) {
      console.error('Gagal menyimpan profil:', err)
      setNoticeProfil({ type: 'error', message: err.message || 'Gagal menyimpan profil' })
    } finally {
      setSavingProfil(false)
    }
  }

  async function handleGantiPassword() {
    setNoticePassword({ type: '', message: '' })
    if (!passwordBaru || passwordBaru.length < 6) {
      setNoticePassword({ type: 'error', message: 'Password minimal 6 karakter.' })
      return
    }
    if (passwordBaru !== konfirmasiPassword) {
      setNoticePassword({ type: 'error', message: 'Konfirmasi password tidak cocok.' })
      return
    }

    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordBaru })
      if (error) throw error
      setNoticePassword({ type: 'success', message: 'Password berhasil diubah.' })
      setPasswordBaru('')
      setKonfirmasiPassword('')
    } catch (err) {
      console.error('Gagal mengubah password:', err)
      setNoticePassword({ type: 'error', message: err.message || 'Gagal mengubah password' })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat pengaturan...</div>
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#12123a]'

  return (
    <div className="min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-400">Kelola informasi profil dan keamanan akun Anda</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profil */}
        <div className="rounded-3xl bg-white p-6 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <User size={17} className="text-[#12123a]" /> Informasi Profil
          </h2>

          <Notice type={noticeProfil.type} message={noticeProfil.message} />

          {/* Foto profil */}
          <div className="mb-6 flex items-center gap-5">
            <label className="group relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full">
              <Avatar nama={fullName} url={avatarPreview} className="h-24 w-24 text-2xl" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <Camera size={20} className="text-white" />
              </span>
              <input type="file" accept="image/*" onChange={handlePilihAvatar} className="hidden" />
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-900">Foto Profil</p>
              <p className="mt-0.5 text-xs text-slate-400">Klik foto untuk mengganti. Format JPG/PNG.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">Email tidak dapat diubah.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Nomor Telepon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={handleSimpanProfil}
            disabled={savingProfil}
            className="mt-6 rounded-full bg-[#12123a] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
          >
            {savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

        {/* Ganti Password */}
        <div className="h-fit rounded-3xl bg-white p-6">
          <h2 className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <Lock size={17} className="text-[#12123a]" /> Ganti Password
          </h2>

          <Notice type={noticePassword.type} message={noticePassword.message} />

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Password Baru</label>
              <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Konfirmasi Password</label>
              <input
                type="password"
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={handleGantiPassword}
            disabled={savingPassword}
            className="mt-6 w-full rounded-full border border-[#12123a] py-3 text-sm font-semibold text-[#12123a] transition hover:bg-slate-50 disabled:opacity-50"
          >
            {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </div>
      </div>
    </div>
  )
}