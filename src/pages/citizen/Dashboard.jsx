import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LocateFixed, MapPinned, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { STATUS_FLOW, STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'
import { fmtDate } from '../../lib/format'
import { useNotifications } from '../../lib/notifications'
import { useUserLocation } from '../../lib/useUserLocation'
import { Button, Card, EmptyState, SeverityBadge, StatusBadge } from '../../components/ui'
import MapView from '../../components/MapView'
import NotificationList from '../../components/NotificationList'

const NEARBY_DEG = 0.05 // about 5 km

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const { items, unread, loading: notifLoading, markRead, markAllRead } = useNotifications(5)
  const { location, status: locStatus, request } = useUserLocation({ auto: true })
  const [nearby, setNearby] = useState([])

  useEffect(() => {
    supabase.from('complaints').select('id, complaint_number, title, category, severity, status, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints(data ?? []); setLoading(false) })
  }, [user.id])

  useEffect(() => {
    if (!location) return
    supabase.from('public_complaints').select('*')
      .gte('latitude', location.lat - NEARBY_DEG).lte('latitude', location.lat + NEARBY_DEG)
      .gte('longitude', location.lng - NEARBY_DEG).lte('longitude', location.lng + NEARBY_DEG).limit(200)
      .then(({ data }) => setNearby(data ?? []))
  }, [location])

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_FLOW.map((s) => [s, 0]))
    let closed = 0
    complaints.forEach((x) => { if (x.status in c) c[x.status]++; else closed++ })
    return { ...c, closed }
  }, [complaints])

  const markers = nearby.map((n) => ({ id: n.id, lat: n.latitude, lng: n.longitude, severity: n.severity, title: n.title, status: n.status, category: n.category }))
  const firstName = (profile?.name ?? '').split(' ')[0]

  return (
    <div className="page">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{firstName ? `Welcome, ${firstName}` : 'Welcome'}</h1>
          <p className="text-navy-500">Here is what is happening with your reports.</p>
        </div>
        <Button as={Link} to="/report" size="lg" icon={Plus}>Report an issue</Button>
      </div>

      <section aria-label="Complaints by status" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...STATUS_FLOW, 'closed'].map((s) => {
          const label = s === 'closed' ? 'Rejected or duplicate' : STATUS_LABELS[s]
          const color = s === 'closed' ? '#64748B' : STATUS_COLORS[s]
          return (
            <Link key={s} to={s === 'closed' ? '/complaints' : `/complaints?status=${s}`} className="rounded-xl border border-line bg-white p-4 shadow-card hover:border-brand/40">
              {loading ? <div className="skeleton h-8 w-10" /> : <p className="font-display text-3xl font-extrabold" style={{ color }}>{counts[s]}</p>}
              <p className="mt-1 text-sm text-navy-500">{label}</p>
            </Link>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent complaints" action={<Link to="/complaints" className="text-sm font-semibold text-brand hover:underline">View all</Link>} padded={false}>
          {loading ? (
            <div className="space-y-3 p-5" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
          ) : complaints.length === 0 ? (
            <EmptyState title="No complaints yet" description="Your reports will appear here." action={<Button as={Link} to="/report">Report an issue</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {complaints.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/complaints/${c.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.title}</p>
                      <p className="text-xs text-navy-500">{c.complaint_number} · {fmtDate(c.created_at)}</p>
                    </div>
                    <SeverityBadge severity={c.severity} />
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={unread ? `Notifications (${unread} new)` : 'Notifications'}
          action={unread > 0 && <button onClick={markAllRead} className="text-sm font-semibold text-brand hover:underline">Mark all read</button>}
          padded={false}
        >
          <NotificationList items={items} loading={notifLoading} onRead={markRead} />
        </Card>

        <Card title="Issues near you" className="lg:col-span-2" action={<Link to="/explore" className="text-sm font-semibold text-brand hover:underline">Open full map</Link>}>
          {location ? (
            <>
              <MapView className="h-72 w-full" center={location} userLocation={location} markers={markers} zoom={14} />
              <p className="mt-2 text-xs text-navy-500">{markers.length ? `${markers.length} reported issue${markers.length > 1 ? 's' : ''} within about 5 km.` : 'No reported issues within about 5 km of you.'}</p>
            </>
          ) : (
            <EmptyState
              icon={MapPinned}
              title="See what is reported around you"
              description={locStatus === 'denied' ? 'Location permission was denied. Allow it in your browser settings, or open the full map.' : 'Share your location to see nearby issues. It is only used in your browser.'}
              action={locStatus !== 'denied' && <Button icon={LocateFixed} loading={locStatus === 'loading'} onClick={request}>Show issues near me</Button>}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
