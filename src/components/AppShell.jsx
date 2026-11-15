// Citizen layout: top navigation + page outlet + disclaimer footer. Used by App.jsx for citizen pages.
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DISCLAIMER } from '../lib/constants'
import Button from './ui/Button'
import NotificationBell from './NotificationBell'

const link = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-soft text-brand' : 'text-navy-500 hover:bg-canvas hover:text-navy'}`

export default function AppShell() {
  const { user, profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 shadow-[0_1px_8px_rgba(24,56,47,.04)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="mr-2 flex items-center gap-2 font-display text-xl font-extrabold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white shadow-sm"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
            CivicEye
          </Link>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {user && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
            {user && <NavLink to="/report" className={(s) => `${link(s)} sm:hidden`}>Report</NavLink>}
            {user && <NavLink to="/complaints" className={link}>My complaints</NavLink>}
            <NavLink to="/explore" className={link}>Explore map</NavLink>
            {role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
          </nav>
          {user ? (
            <div className="flex items-center gap-2">
              <Button as={Link} to="/report" size="sm" className="hidden sm:inline-flex">Report an issue</Button>
              <NotificationBell />
              <span className="hidden text-sm text-navy-500 md:block">{profile?.name ?? user.email}</span>
              <Button variant="ghost" size="sm" icon={LogOut} aria-label="Sign out" onClick={async () => { await signOut(); navigate('/') }} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button>
              <Button as={Link} to="/register" size="sm">Register</Button>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-line bg-white px-4 py-5 text-center text-xs text-navy-500">{DISCLAIMER}</footer>
    </div>
  )
}
