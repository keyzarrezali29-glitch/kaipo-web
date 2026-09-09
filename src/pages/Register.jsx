import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, User, Mail, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import logoKaipo from '../assets/logo-kai-po.png'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg(''); setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (error) throw error
      setSuccess(true)
    } catch (err) { setErrorMsg(err.message) } 
    finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      
      {/* TOMBOL KEMBALI DI POJOK KANAN ATAS (Area Oren) */}
      <Link 
        to="/" 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-full shadow-md text-sm font-medium text-slate-700 hover:shadow-lg hover:bg-slate-50 transition"
      >
        <span>&larr;</span> Kembali
      </Link>

      {/* SEBELAH KIRI: PUTIH dengan Logo K */}
      <div className="hidden lg:flex lg:w-[50%] flex-col justify-between bg-white p-14 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#0a1128]/5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#0a1128]/5" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-20">
            <img src={logoKaipo} alt="KAI-PO" className="w-12 h-12 object-contain mix-blend-multiply" />
            <span className="text-[#0a1128] text-2xl font-black tracking-widest">KAI-PO</span>
          </div>

          <div className="flex-1 flex flex-col justify-center mb-10">
            <h1 className="text-5xl font-black text-[#0a1128] leading-[1.1] mb-6">
              Mulai <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0a1128] to-slate-500">Servis Anda</span>
            </h1>
            <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
              Daftarkan diri Anda sekarang untuk mengakses layanan eksklusif KAI-PO. Booking servis jadi lebih mudah dan cepat.
            </p>
          </div>
          <p className="text-slate-300 text-[10px] uppercase tracking-widest">© 2026 KAI-PO Garage System</p>
        </div>
      </div>

      {/* SEBELAH KANAN: NAVY dengan Form Register */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a1128]">
        <div className="w-full max-w-md bg-[#0a1128] p-10 rounded-3xl shadow-2xl border border-white/10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white text-center">Buat Akun Baru</h1>
            <p className="mt-2 text-white/50 text-sm text-center">Daftar sebagai Customer</p>
          </div>

          {success ? (
            <div className="rounded-xl bg-white/10 border border-white/10 px-6 py-10 text-center shadow-sm">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={40} />
              <p className="mb-1 text-lg font-bold text-white">Akun berhasil dibuat!</p>
              <p className="text-sm text-white/60">Silakan login lewat aplikasi mobile KAI-PO.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#0a1128]/50">
                    <User size={18} />
                  </div>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama kamu" required
                    className="w-full rounded-xl bg-white border border-white/10 pl-11 pr-4 py-3.5 text-sm text-[#0a1128] placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-white/20" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#0a1128]/50">
                    <Mail size={18} />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required
                    className="w-full rounded-xl bg-white border border-white/10 pl-11 pr-4 py-3.5 text-sm text-[#0a1128] placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-white/20" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#0a1128]/50">
                    <Lock size={18} />
                  </div>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" minLength={6} required
                    className="w-full rounded-xl bg-white border border-white/10 pl-11 pr-12 py-3.5 text-sm text-[#0a1128] placeholder-slate-400 outline-none transition focus:ring-4 focus:ring-white/20" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0a1128]">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {errorMsg && <p className="rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-3 text-xs text-red-300">{errorMsg}</p>}

              <button type="submit" disabled={loading} className="w-full rounded-xl bg-white py-4 text-sm font-bold text-[#0a1128] shadow-lg transition hover:scale-[1.01] hover:bg-slate-50 disabled:opacity-50">
                {loading ? 'Memproses...' : 'DAFTAR SEKARANG'}
              </button>
            </form>
          )}
          
          <div className="mt-6 text-center border-t border-white/10 pt-6">
            <p className="text-xs text-white/50">Sudah punya akun? <Link to="/login" className="text-white font-bold hover:underline">Login di sini</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}