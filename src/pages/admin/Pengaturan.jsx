import { useEffect, useState } from 'react'
import { Store, UserCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Pengaturan() {
  const [loading, setLoading] = useState(true)
  const [savingProfil, setSavingProfil] = useState(false)
  const [savingAkun, setSavingAkun] = useState(false)
  const [profilSuccess, setProfilSuccess] = useState(false)
  const [akunSuccess, setAkunSuccess] = useState(false)
  const [error, setError] = useState(null)

  // Profil Bengkel
  const [namaBengkel, setNamaBengkel] = useState('Kai-Po Elite Garage')
  const [alamat, setAlamat] = useState('')
  const [telepon, setTelepon] = useState('')
  const [jamOperasional, setJamOperasional] = useState('Senin - Sabtu, 08.00 - 17.00')
  const [deskripsi, setDeskripsi] = useState('')

  // Akun Saya
  const [namaAdmin, setNamaAdmin] = useState('')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        if (profile) {
          setNamaAdmin(profile.full_name ?? '')
          setEmailAdmin(profile.email ?? '')
        }

        // pengaturan_bengkel: tabel opsional, kalau belum ada di database ini akan gagal senyap
        const { data: bengkel } = await supabase
          .from('pengaturan_bengkel')
          .select('*')
          .maybeSingle()

        if (bengkel) {
          setNamaBengkel(bengkel.nama_bengkel ?? namaBengkel)
          setAlamat(bengkel.alamat ?? '')
          setTelepon(bengkel.telepon ?? '')
          setJamOperasional(bengkel.jam_operasional ?? jamOperasional)
          setDeskripsi(bengkel.deskripsi ?? '')
        }
      } catch (err) {
        console.error('Gagal memuat pengaturan:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSimpanProfilBengkel(e) {
    e.preventDefault()
    setSavingProfil(true)
    setProfilSuccess(false)
    setError(null)
    try {
      const { error: upsertError } = await supabase
        .from('pengaturan_bengkel')
        .upsert({
          id: 1, // baris tunggal, karena cuma ada 1 bengkel
          nama_bengkel: namaBengkel,
          alamat,
          telepon,
          jam_operasional: jamOperasional,
          deskripsi,
        })
      if (upsertError) throw upsertError
      setProfilSuccess(true)
      setTimeout(() => setProfilSuccess(false), 2500)
    } catch (err) {
      setError('Gagal menyimpan profil bengkel: ' + err.message)
    } finally {
      setSavingProfil(false)
    }
  }

  async function handleSimpanAkun(e) {
    e.preventDefault()
    setSavingAkun(true)
    setAkunSuccess(false)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: namaAdmin })
        .eq('id', user.id)
      if (profileError) throw profileError

      if (passwordBaru) {
        if (passwordBaru !== konfirmasiPassword) {
          throw new Error('Konfirmasi password tidak cocok.')
        }
        if (passwordBaru.length < 6) {
          throw new Error('Password minimal 6 karakter.')
        }
        const { error: passError } = await supabase.auth.updateUser({ password: passwordBaru })
        if (passError) throw passError
      }

      setPasswordBaru('')
      setKonfirmasiPassword('')
      setAkunSuccess(true)
      setTimeout(() => setAkunSuccess(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingAkun(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat pengaturan...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-400">Kelola profil bengkel dan akun Anda</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* PROFIL BENGKEL */}
        <form onSubmit={handleSimpanProfilBengkel} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Store size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Profil Bengkel</h2>
              <p className="text-xs text-slate-400">Ditampilkan ke customer di aplikasi mobile</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Nama Bengkel" value={namaBengkel} onChange={setNamaBengkel} required />
            <Field label="Alamat" value={alamat} onChange={setAlamat} placeholder="Jl. Raya Serpong No.123, Tangerang Selatan" />
            <Field label="Nomor Telepon" value={telepon} onChange={setTelepon} placeholder="0812xxxxxxx" />
            <Field label="Jam Operasional" value={jamOperasional} onChange={setJamOperasional} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Deskripsi Singkat</label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                rows={3}
                placeholder="Bengkel spesialis servis mobil dengan teknisi berpengalaman..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfil}
              className="rounded-xl bg-[#0f1b4c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            {profilSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={14} /> Tersimpan
              </span>
            )}
          </div>
        </form>

        {/* AKUN SAYA */}
        <form onSubmit={handleSimpanAkun} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <UserCircle size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Akun Saya</h2>
              <p className="text-xs text-slate-400">Ubah nama dan password login Anda</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field label="Nama" value={namaAdmin} onChange={setNamaAdmin} required />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
              <input
                value={emailAdmin}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-400"
              />
            </div>
            <Field
              label="Password Baru (kosongkan jika tidak ingin ganti)"
              type="password"
              value={passwordBaru}
              onChange={setPasswordBaru}
              placeholder="Minimal 6 karakter"
            />
            <Field
              label="Konfirmasi Password Baru"
              type="password"
              value={konfirmasiPassword}
              onChange={setKonfirmasiPassword}
              placeholder="Ulangi password baru"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={savingAkun}
              className="rounded-xl bg-[#0f1b4c] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingAkun ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            {akunSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={14} /> Tersimpan
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  )
}