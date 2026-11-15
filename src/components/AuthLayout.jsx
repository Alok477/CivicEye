// Split-screen layout for Login / Register. Props: title, subtitle, children
import { Link } from 'react-router-dom'
import { DISCLAIMER, TAGLINE } from '../lib/constants'
import BrandLogo from './BrandLogo'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <Link to="/" aria-label="CivicEye home" className="flex items-center">
          <BrandLogo className="h-10" />
        </Link>
        <p className="relative max-w-sm font-display text-4xl font-extrabold leading-tight">{TAGLINE}</p>
        <p className="max-w-sm text-sm text-white/60">{DISCLAIMER}</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" aria-label="CivicEye home" className="mb-8 flex items-center lg:hidden">
            <BrandLogo />
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
