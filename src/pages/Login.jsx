import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Settings, Calendar, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import logoKaipo from '../assets/logo-kai-po.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function doLogin(loginEmail, loginPassword) {
    setErrorMsg(''); setLoading(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (loginError) throw loginError
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profileError) throw profileError

      if (profile.role === 'admin') navigate('/admin/dashboard')
      else if (profile.role === 'mekanik') navigate('/mekanik/dashboard')
      else if (profile.role === 'customer') navigate('/customer/dashboard')
    } catch (err) {
      setErrorMsg(err.message === 'Invalid login credentials' ? 'Email atau password salah.' : err.message)
    } finally { setLoading(false) }
  }

  function handleSubmit(e) { e.preventDefault(); doLogin(email, password) }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      
      {/* TOMBOL KEMBALI DI POJOK KANAN ATAS (Area Oren) */}
      <Link 
        to="/" 
        className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-full shadow-md text-sm font-medium text-slate-700 hover:shadow-lg hover:bg-slate-50 transition"
      >
        <span>&larr;</span> Kembali
      </Link>

      {/* KIRI: Background Navy */}
      <div className="hidden lg:flex lg:w-[50%] flex-col justify-between relative bg-[#0a1128] p-14 overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[2px] border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-[2px] border-white/5 rounded-full" />
        <div className="absolute right-10 bottom-1/3 w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
           <Settings className="text-white/10" size={32} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header Logo (Sekarang tanpa tombol kembali) */}
          <div className="flex items-center gap-3 mb-20">
            <div className="bg-transparent">
              <img src={logoKaipo} alt="KAI-PO" className="w-12 h-12 object-contain mix-blend-multiply brightness-110" />
            </div>
            <span className="text-white text-2xl font-black tracking-widest">KAI-PO</span>
            <span className="text-[10px] font-semibold text-white/40 bg-white/10 px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">Garage</span>
          </div>

          {/* Konten Utama Kiri */}
          <div className="flex-1 flex flex-col justify-center mb-10">
            <h1 className="text-5xl font-black text-white leading-[1.1] mb-6">
              Kelola <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Kendaraan Anda</span>
            </h1>
            <p className="text-blue-200/60 max-w-sm leading-relaxed text-sm">
              Platform manajemen bengkel terintegrasi untuk Admin & Mekanik. Pantau servis, stok, dan performa dalam satu dashboard.
            </p>

            <div className="mt-10 flex items-center justify-between p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl max-w-sm group hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="bg-[#f5a524]/20 p-3 rounded-xl">
                  <Calendar className="text-[#f5a524]" size={24} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Ada jadwal servis baru?</p>
                  <p className="text-blue-300/50 text-xs">Cek dashboard sekarang</p>
                </div>
              </div>
              <ArrowRight className="text-white/20 group-hover:text-white transition" size={20} />
            </div>
          </div>
          
          <p className="text-white/20 text-[10px] uppercase tracking-widest">© 2026 KAI-PO Garage System</p>
        </div>
      </div>

      {/* KANAN: Form Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0a1128]">Selamat Datang</h1>
            <p className="mt-2 text-slate-500 text-sm">Silakan masuk untuk mengakses panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kaipo.com"
                  required
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#0a1128] focus:ring-2 focus:ring-[#0a1128]/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-11 pr-12 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#0a1128] focus:ring-2 focus:ring-[#0a1128]/10"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-xs font-medium text-[#0a1128]/70 hover:text-[#0a1128] underline">Lupa password?</a>
            </div>

            {errorMsg && <p className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600 font-medium">{errorMsg}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#0a1128] py-4 text-sm font-bold text-white shadow-lg shadow-[#0a1128]/20 transition hover:bg-[#182a72] hover:scale-[1.01] disabled:opacity-50">
              {loading ? 'Memproses...' : 'MASUK SEKARANG'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
             <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-3">Akses Demo Cepat</p>
             <div className="flex gap-2">
                <button onClick={() => {setEmail('admin@kaipo.com'); setPassword('Admin123');}} className="flex-1 border border-slate-200 rounded-xl py-2.5 bg-slate-50 hover:bg-[#0a1128] hover:text-white transition text-xs font-semibold text-slate-700">Admin</button>
                <button onClick={() => {setEmail('mekanik1@kaipo.com'); setPassword('Mekanik123!');}} className="flex-1 border border-slate-200 rounded-xl py-2.5 bg-slate-50 hover:bg-[#0a1128] hover:text-white transition text-xs font-semibold text-slate-700">Mekanik</button>
             </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Belum punya akses? <Link to="/register" className="text-[#0a1128] font-bold hover:underline">Hubungi Admin</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}