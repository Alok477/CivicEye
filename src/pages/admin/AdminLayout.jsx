// src/pages/admin/AdminLayout.jsx
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  BarChart3,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { USE_MOCK } from '../../lib/adminApi'
import { NotifyProvider } from '../../components/admin/adminUi'
import BrandLogo from '../../components/BrandLogo'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/admin/map', label: 'Map', icon: MapIcon },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

function SidebarContent({ collapsed, onNavigate }) {
  return (
    <>
      <div className={`flex items-center gap-3 h-16 px-4 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <BrandLogo markOnly alt={collapsed ? 'CivicEye' : ''} className="h-9 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-semibold">CivicEye</p>
            <p className="text-xs text-white/60">Control room</p>
          </div>
        )}
      </div>
      <nav aria-label="Admin" className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white ${
                collapsed ? 'justify-center' : ''
              } ${isActive ? 'bg-brand text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon size={18} aria-hidden="true" />
            {collapsed ? <span className="sr-only">{label}</span> : <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      {!collapsed && (
        <p className="px-4 py-4 text-xs text-white/50 border-t border-white/10">
          Demo environment. Not connected to any municipal system.
        </p>
      )}
    </>
  )
}

function AdminShell() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('civiceye.sidebar') === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('civiceye.sidebar', collapsed ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }, [collapsed])

  useEffect(() => setMobileOpen(false), [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const name = profile?.name || user?.email || 'Admin'

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const iconBtn =
    'inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-brand'

  return (
    <div className="flex min-h-screen bg-canvas text-navy">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex sticky top-0 h-screen shrink-0 flex-col bg-navy text-white transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative flex w-64 max-w-[80%] flex-col bg-navy text-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            className={`${iconBtn} lg:hidden`}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${iconBtn} hidden lg:inline-flex`}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white" aria-hidden="true">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="hidden sm:block leading-tight">
              <p className="max-w-[180px] truncate text-sm font-medium">{name}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-navy hover:bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </header>

        {USE_MOCK && (
          <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 sm:px-6">
            Mock data is on. Set USE_MOCK to false in src/lib/adminApi.js to use the live backend.
          </div>
        )}

        <main id="admin-main" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <NotifyProvider>
      <AdminShell />
    </NotifyProvider>
  )
}
