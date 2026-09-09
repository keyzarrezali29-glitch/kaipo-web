import { useEffect, useState } from 'react'
import { User, Camera, AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function CustomerPengaturan() {
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

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-400">Kelola informasi profil dan keamanan akun Anda</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profil */}
        <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <User size={16} className="text-indigo-600" /> Informasi Profil
          </h2>

          {noticeProfil.message && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-xs font-medium ${noticeProfil.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {noticeProfil.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
              <span>{noticeProfil.message}</span>
            </div>
          )}

          {/* Foto profil */}
          <div className="mb-5 flex items-center gap-4">
            <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full bg-slate-100">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <User size={28} />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <Camera size={18} className="text-white" />
              </span>
              <input type="file" accept="image/*" onChange={handlePilihAvatar} className="hidden" />
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-900">Foto Profil</p>
              <p className="text-xs text-slate-400">Klik foto untuk mengganti. Format JPG/PNG.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-400">Email tidak dapat diubah.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Nomor Telepon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <button
            onClick={handleSimpanProfil}
            disabled={savingProfil}
            className="mt-5 rounded-xl bg-[#12123a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
          >
            {savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>

        {/* Ganti Password */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lock size={16} className="text-indigo-600" /> Ganti Password
          </h2>

          {noticePassword.message && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-xs font-medium ${noticePassword.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {noticePassword.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
              <span>{noticePassword.message}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Password Baru</label>
              <input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Konfirmasi Password</label>
              <input
                type="password"
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <button
            onClick={handleGantiPassword}
            disabled={savingPassword}
            className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
          </button>
        </div>
      </div>
    </div>
  )
}