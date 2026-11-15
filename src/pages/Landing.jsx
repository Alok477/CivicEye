import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BellRing, Camera, CheckCircle2, Copy, Eye, Gauge, ImagePlus, ListChecks, Map as MapIcon, MapPin, ShieldAlert, Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { DISCLAIMER, TAGLINE } from '../lib/constants'
import { Button, SeverityBadge } from '../components/ui'
import CivicIllustration from '../components/CivicIllustration'
import BrandLogo from '../components/BrandLogo'

const STEPS = [
  { icon: Camera, title: 'Snap or describe', text: 'Take a photo, type a few words or speak. Any one of them is enough to start.' },
  { icon: Sparkles, title: 'AI analyses', text: 'The report is turned into a structured complaint with a category, severity and the right department.' },
  { icon: CheckCircle2, title: 'You confirm', text: 'Check and edit every field, then pin the exact location. Nothing is sent until you submit.' },
  { icon: ListChecks, title: 'Track to resolution', text: 'Follow each status change from submitted to resolved, with remarks from the administrators.' },
]

const FEATURES = [
  { icon: ImagePlus, title: 'Multimodal reporting', text: 'Photo, text or voice. Use whatever is quickest where you are standing.' },
  { icon: Gauge, title: 'AI prioritisation', text: 'Every report gets a suggested severity and priority score so urgent hazards surface first.' },
  { icon: Copy, title: 'Duplicate detection', text: 'Reports of the same incident are grouped, so departments see one issue instead of twenty.' },
  { icon: MapIcon, title: 'Live map', text: 'See what has been reported around you. The public map shows no personal details.' },
  { icon: BellRing, title: 'Automated updates', text: 'You are notified when your complaint is reviewed, assigned or resolved.' },
  { icon: Eye, title: 'Transparency', text: 'Every status change is recorded in a timeline you can read at any time.' },
]

function Preview() {
  return (
    <div className="enter-up enter-up-delay relative" role="img" aria-label="Illustration of a civic report being reviewed and repaired">
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-surface shadow-lift">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-2 text-xs text-navy-500">Illustrative preview, not real data</span>
        </div>
        <div className="grid sm:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />AI suggested, please review</div>
            <p className="font-display text-lg font-bold leading-snug">Large pothole at the bus stop crossing</p>
            <div className="flex flex-wrap gap-2"><SeverityBadge severity="High" /><span className="rounded-md bg-canvas px-2.5 py-1 text-xs font-semibold">Road Damage</span></div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-navy-500"><span>Priority score</span><span className="font-semibold text-navy">78 / 100</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-[78%] rounded-full bg-high" /></div>
            </div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-critical"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />Possible safety risk for two-wheelers</p>
            <p className="text-xs text-navy-500">Department: Road Maintenance</p>
          </div>
          <div className="min-h-48 overflow-hidden border-t border-line sm:border-l sm:border-t-0">
            <CivicIllustration />
          </div>
        </div>
        <div className="flex items-center gap-1 border-t border-line px-5 py-3 text-[11px] font-semibold text-navy-500">
          {['Submitted', 'Under review', 'Assigned', 'In progress', 'Resolved'].map((s, i) => (
            <span key={s} className={`flex-1 rounded-full px-1 py-1 text-center ${i < 3 ? 'bg-brand text-white' : 'bg-slate-100'}`}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function useLiveCounts() {
  const [stats, setStats] = useState({ state: 'loading' })
  useEffect(() => {
    const count = (build) => build(supabase.from('public_complaints').select('id', { count: 'exact', head: true }))
    Promise.all([count((q) => q), count((q) => q.eq('status', 'RESOLVED')), count((q) => q.in('severity', ['Critical', 'High']))])
      .then(([all, resolved, urgent]) => {
        if (all.error) return setStats({ state: 'error' })
        setStats({ state: 'ok', total: all.count ?? 0, resolved: resolved.count ?? 0, urgent: urgent.count ?? 0 })
      })
      .catch(() => setStats({ state: 'error' }))
  }, [])
  return stats
}

export default function Landing() {
  const { user, role } = useAuth()
  const stats = useLiveCounts()
  const home = role === 'admin' ? '/admin' : '/dashboard'

  useEffect(() => {
    document.documentElement.classList.add('landing-page')
    return () => document.documentElement.classList.remove('landing-page')
  }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <header className="relative z-10 mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="CivicEye home" className="flex items-center">
          <BrandLogo className="h-9" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Button as={Link} to="/explore" variant="ghost" size="sm" className="hidden sm:inline-flex">Explore map</Button>
          {user ? <Button as={Link} to={home} size="sm">Go to dashboard</Button> : (
            <><Button as={Link} to="/login" variant="ghost" size="sm">Log in</Button><Button as={Link} to="/register" size="sm">Register</Button></>
          )}
        </nav>
      </header>

      <section className="relative isolate overflow-hidden border-y border-line bg-surface">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-brand-soft blur-3xl" />
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[5fr_6fr] lg:py-24">
        <div className="enter-up min-w-0">
          <span className="civic-eyebrow"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Your neighborhood, heard</span>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">{TAGLINE}</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-navy-500">
            Photograph a pothole, a broken streetlight or a leaking pipe. CivicEye drafts the complaint, you check it, and you follow it until it is fixed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as={Link} to="/report" size="lg">Report an Issue<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
            {!user && <Button as={Link} to="/login" variant="secondary" size="lg">Log in</Button>}
            {!user && <Button as={Link} to="/register" variant="ghost" size="lg">Create an account</Button>}
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-navy-500"><CheckCircle2 className="h-4 w-4 text-low" aria-hidden="true" /> Your report stays visible from submission to resolution.</p>
        </div>
        <div className="min-w-0"><Preview /></div>
        </div>
      </section>

      <section className="bg-navy py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Small neighborhood problems deserve a clear path to getting fixed.</h2>
          <p className="text-lg text-white/70">
            No confusing departments. No reports disappearing into the void. CivicEye helps residents share what needs attention and gives local teams a clear view of what is happening.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="mb-10 text-3xl font-extrabold">How it works</h2>
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft font-display font-bold text-brand">{i + 1}</span>
                <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-navy-500">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface py-16" aria-labelledby="features">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="features" className="mb-10 text-3xl font-extrabold">Built for people and for the departments that fix things</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-canvas/70 p-6 transition-transform hover:-translate-y-0.5">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-navy-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand py-16 text-white sm:py-20" aria-labelledby="impact">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 id="impact" className="text-3xl font-extrabold">Reported on CivicEye so far</h2>
        <p className="mb-8 mt-1 text-sm text-white/75">Live counts from this CivicEye instance. They may include seeded demo records.</p>
        {stats.state === 'error' ? (
          <p className="text-white/75">Live counts are unavailable right now.</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-3">
            {[['Issues reported', stats.total], ['Marked resolved', stats.resolved], ['High or critical', stats.urgent]].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
                <dd className="font-display text-4xl font-extrabold">{stats.state === 'loading' ? <span className="skeleton inline-block h-9 w-16" /> : value}</dd>
                <dt className="mt-1 text-sm text-white/75">{label}</dt>
              </div>
            ))}
          </dl>
        )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="trust">
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-card sm:p-10">
          <h2 id="trust" className="text-3xl font-extrabold">Honest about what AI does</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-3 text-navy-700 sm:grid-cols-2">
            {[
              'AI severity is a recommendation, labelled "AI suggested". Administrators make the final call.',
              'You see and edit everything the AI wrote before it is submitted.',
              'Locations come from your device or a pin you place. Nothing is guessed.',
              'The public map shows issues, never names or contact details.',
              'Demo records are always labelled "Demo data".',
              'Built on free and open-source tools.',
            ].map((t) => (
              <li key={t} className="flex gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-low" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-line bg-surface px-4 py-8 text-center">
        <BrandLogo className="mx-auto h-7" />
        <p className="mx-auto mt-2 max-w-xl text-xs text-navy-500">{DISCLAIMER}</p>
      </footer>
    </div>
  )
}
