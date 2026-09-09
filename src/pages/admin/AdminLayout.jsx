import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Wrench,
  Car,
  ClipboardList,
  Package,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Tag,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logoKaipo from '../../assets/logo-kai-po.png'

const NAV_SECTIONS = [
  {
    title: 'PANEL ADMIN',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/admin/booking', label: 'Booking Servis', icon: CalendarCheck },
    ],
  },
  {
    title: 'DATA MASTER',
    items: [
      { to: '/admin/customer', label: 'Data Customer', icon: Users },
      { to: '/admin/mekanik', label: 'Data Mekanik', icon: Wrench },
      { to: '/admin/kendaraan', label: 'Data Kendaraan', icon: Car },
      { to: '/admin/servis', label: 'Data Servis', icon: ClipboardList },
      { to: '/admin/produk', label: 'Produk & Sparepart', icon: Package },
      { to: '/admin/promo', label: 'Promo', icon: Tag },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { to: '/admin/transaksi', label: 'Transaksi', icon: Receipt },
      { to: '/admin/laporan', label: 'Laporan', icon: BarChart3 },
    ],
  },
  {
    title: 'LAINNYA',
    items: [{ to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings }],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Sidebar */}
      <aside className="no-print fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#12123a] px-4 py-6 shadow-2xl transition-all duration-300">
        
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-2">
            <img src={logoKaipo} alt="Kai-Po" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">KAI-PO</span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pr-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-red-500/20 hover:text-red-400"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 bg-slate-50 p-8 min-h-screen overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}