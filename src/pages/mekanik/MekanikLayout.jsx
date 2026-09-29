import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  History,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logoKaipo from '../../assets/logo-kai-po.png'
import Avatar from '../../components/Avatar'

const NAV_ITEMS = [
  { to: '/mekanik/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mekanik/pekerjaan', label: 'Daftar Pekerjaan', icon: ClipboardList },
  { to: '/mekanik/riwayat', label: 'Riwayat Pekerjaan', icon: History },
  { to: '/mekanik/profil', label: 'Profil', icon: UserCircle },
]

export default function MekanikLayout() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)

  const loadProfil = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('id', user.id)
      .single()
    setProfil(data)
  }, [])

  useEffect(() => {
    loadProfil()
  }, [loadProfil])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar floating */}
      <aside className="no-print fixed bottom-4 left-4 top-4 z-50 flex w-60 flex-col rounded-3xl bg-[#12123a] px-4 py-6 shadow-2xl">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 p-2">
            <img src={logoKaipo} alt="Kai-Po" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">KAI-PO</span>
        </div>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          PANEL MEKANIK
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-indigo-500" />
                  )}
                  <Icon
                    size={18}
                    className={`transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </aside>

      {/* Konten */}
      <main className="ml-[17.5rem] min-h-screen">
        <div className="no-print flex justify-end px-8 pt-6">
          <div className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5">
            <Avatar nama={profil?.full_name} url={profil?.avatar_url} className="h-10 w-10 text-sm" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">{profil?.full_name ?? 'Mekanik'}</p>
              <p className="text-xs text-slate-400">{profil?.email ?? ''}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-8 pb-8 pt-4">
          {/* refreshProfil dilewatkan ke semua halaman lewat Outlet context,
              dipanggil ProfilMekanik.jsx setelah simpan profil berhasil */}
          <Outlet context={{ refreshProfil: loadProfil }} />
        </div>
      </main>
    </div>
  )
}