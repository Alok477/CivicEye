// Split-screen layout for Login / Register. Props: title, subtitle, children
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { DISCLAIMER, TAGLINE } from '../lib/constants'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand"><MapPin className="h-5 w-5" aria-hidden="true" /></span>
          CivicEye
        </Link>
        <p className="relative max-w-sm font-display text-4xl font-extrabold leading-tight">{TAGLINE}</p>
        <p className="max-w-sm text-sm text-white/60">{DISCLAIMER}</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl font-extrabold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
            CivicEye
          </Link>
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-navy-500">{subtitle}</p>
          {children}
          <p className="mt-8 text-xs text-navy-500 lg:hidden">{DISCLAIMER}</p>
        </div>
      </main>
    </div>
  )
}
