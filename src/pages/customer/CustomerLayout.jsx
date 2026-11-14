import { useEffect, useState, useCallback } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  History,
  Car,
  Tag,
  MessageSquare,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import logoKaipo from '../../assets/logo-kai-po.png'
import Avatar from '../../components/Avatar'
import NotifikasiBell from '../../components/NotifikasiBell'

const NAV_ITEMS = [
  { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customer/booking', label: 'Booking', icon: CalendarCheck },
  { to: '/customer/riwayat', label: 'Riwayat Servis', icon: History },
  { to: '/customer/kendaraan', label: 'Kendaraan', icon: Car },
  { to: '/customer/promo', label: 'Promo', icon: Tag },
  { to: '/customer/pesan', label: 'Pesan', icon: MessageSquare },
  { to: '/customer/pengaturan', label: 'Pengaturan', icon: Settings },
  { to: '/customer/bantuan', label: 'Bantuan', icon: HelpCircle },
]

export default function CustomerLayout() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false) // menu geser untuk layar kecil

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
      {/* Latar gelap saat menu terbuka di layar kecil */}
      {menuOpen && (
        <div className="no-print fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar: menempel di kiri pada layar besar (lg ke atas), menu geser pada layar kecil */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-[#12123a] px-4 py-6 transition-transform duration-300 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 p-2">
            <img src={logoKaipo} alt="Kai-Po" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">KAI-PO</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Menu tetap bisa di-scroll (mouse / trackpad), tapi scrollbar-nya disembunyikan */}
        <nav className="flex-1 space-y-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
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
      <main className="min-h-screen lg:ml-60">
        <div className="no-print flex items-center justify-end gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="mr-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#12123a] lg:hidden"
            aria-label="Buka menu"
          >
            <Menu size={20} />
          </button>
          <NotifikasiBell />
          <div className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-2 sm:pr-5">
            <Avatar nama={profil?.full_name} url={profil?.avatar_url} className="h-10 w-10 text-sm" />
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-slate-900">{profil?.full_name ?? 'Customer'}</p>
              <p className="text-xs text-slate-400">{profil?.email ?? ''}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-4 sm:px-8">
          {/* refreshProfil dilewatkan ke semua halaman lewat Outlet context,
              dipanggil CustomerPengaturan.jsx setelah simpan profil berhasil */}
          <Outlet context={{ refreshProfil: loadProfil }} />
        </div>
      </main>
    </div>
  )
}