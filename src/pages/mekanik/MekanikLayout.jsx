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

const NAV_ITEMS = [
  { to: '/mekanik/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mekanik/pekerjaan', label: 'Daftar Pekerjaan', icon: ClipboardList },
  { to: '/mekanik/riwayat', label: 'Riwayat Pekerjaan', icon: History },
  { to: '/mekanik/profil', label: 'Profil', icon: UserCircle },
]

export default function MekanikLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Fixed, Shadow, Premium */}
      <aside className="no-print fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col bg-[#12123a] px-4 py-6 shadow-2xl transition-all duration-300">
        
        {/* Logo Area */}
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-2">
            <img src={logoKaipo} alt="Kai-Po" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">
            KAI-PO
          </span>
        </div>

        {/* Header Label */}
        <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          PANEL MEKANIK
        </p>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active Indicator Line (Garis Ungu di kiri) */}
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

        {/* Logout Button Premium */}
        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </aside>

      {/* Main Content Area - With Margin to account for fixed sidebar */}
      <main className="ml-[260px] flex-1 bg-[#f8fafc] p-8 min-h-screen overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}