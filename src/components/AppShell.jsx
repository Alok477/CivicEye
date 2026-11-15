// Citizen layout: top navigation + page outlet + disclaimer footer. Used by App.jsx for citizen pages.
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { DISCLAIMER } from '../lib/constants'
import Button from './ui/Button'
import NotificationBell from './NotificationBell'
import BrandLogo from './BrandLogo'

const link = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-soft text-brand' : 'text-navy-500 hover:bg-canvas hover:text-navy'}`

export default function AppShell() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => setMobileMenuOpen(false), [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 shadow-[0_1px_8px_rgba(24,56,47,.04)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" aria-label="CivicEye home" className="mr-2 flex shrink-0 items-center">
            <BrandLogo />
          </Link>
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 overflow-x-auto sm:flex">
            {user && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
            {user && <NavLink to="/report" className={link}>Report</NavLink>}
            {user && <NavLink to="/complaints" className={link}>My complaints</NavLink>}
            <NavLink to="/explore" className={link}>Explore map</NavLink>
            {role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-navy hover:bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-brand sm:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <Button as={Link} to="/report" size="sm" className="hidden sm:inline-flex">Report an issue</Button>
              <NotificationBell />
              <span className="hidden text-sm text-navy-500 md:block">{profile?.name ?? user.email}</span>
              <Button variant="ghost" size="sm" icon={LogOut} aria-label="Sign out" onClick={async () => { await signOut(); navigate('/') }} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
              <Button as={Link} to="/register" size="sm">Register</Button>
            </div>
          )}
        </div>
        {mobileMenuOpen && (
          <nav id="mobile-main-navigation" aria-label="Mobile main" className="border-t border-line bg-surface px-4 py-3 sm:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {user && <NavLink to="/dashboard" className={link} onClick={() => setMobileMenuOpen(false)}>Dashboard</NavLink>}
              {user && <NavLink to="/report" className={link} onClick={() => setMobileMenuOpen(false)}>Report an issue</NavLink>}
              {user && <NavLink to="/complaints" className={link} onClick={() => setMobileMenuOpen(false)}>My complaints</NavLink>}
              <NavLink to="/explore" className={link} onClick={() => setMobileMenuOpen(false)}>Explore map</NavLink>
              {role === 'admin' && <NavLink to="/admin" className={link} onClick={() => setMobileMenuOpen(false)}>Admin</NavLink>}
              {!user && <NavLink to="/login" className={link} onClick={() => setMobileMenuOpen(false)}>Log in</NavLink>}
              {!user && <NavLink to="/register" className={link} onClick={() => setMobileMenuOpen(false)}>Register</NavLink>}
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-line bg-white px-4 py-5 text-center text-xs text-navy-500">{DISCLAIMER}</footer>
    </div>
  )
}
