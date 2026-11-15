import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, SearchX, ShieldAlert, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { STATUS_DESCRIPTIONS, STATUS_COLORS } from '../../lib/constants'
import { fmtDateTime } from '../../lib/format'
import { Button, Card, EmptyState, SeverityBadge, StatusBadge } from '../../components/ui'
import MapView from '../../components/MapView'
import StatusTimeline from '../../components/StatusTimeline'

export default function ComplaintDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const [c, setC] = useState(null)
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // Filtering on user_id keeps other citizens' complaints out, on top of the database's own row rules.
    const { data } = await supabase.from('complaints').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
    setC(data ?? null)
    if (data) {
      const { data: ups } = await supabase.from('complaint_updates')
        .select('id, previous_status, new_status, remarks, created_at').eq('complaint_id', id).order('created_at', { ascending: true })
      setUpdates(ups ?? [])
    }
    setLoading(false)
  }, [id, user.id])

  useEffect(() => { load() }, [load])
  // Pick up admin status changes when the citizen returns to this tab
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (loading) {
    return (
      <div className="page space-y-4" aria-hidden="true">
        <div className="skeleton h-8 w-1/2" /><div className="skeleton h-64 w-full" /><div className="skeleton h-40 w-full" />
      </div>
    )
  }
  if (!c) {
    return (
      <div className="page">
        <EmptyState icon={SearchX} title="Complaint not found" description="It may not exist, or it may belong to another account."
          action={<Button as={Link} to="/complaints" variant="secondary">Back to my complaints</Button>} />
      </div>
    )
  }

  const color = STATUS_COLORS[c.status]
  const hasLocation = Number.isFinite(c.latitude) && Number.isFinite(c.longitude)

  return (
    <div className="page">
      <Link to="/complaints" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-500 hover:text-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />My complaints
      </Link>
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">{c.complaint_number}</p>
        <h1 className="text-3xl font-extrabold">{c.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          <SeverityBadge severity={c.severity} />
          <span className="text-sm text-navy-500">{c.category}{c.subcategory ? ` · ${c.subcategory}` : ''}</span>
          <span className="text-sm text-navy-500">Reported {fmtDateTime(c.created_at)}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          {c.image_url && <img src={c.image_url} alt={`Photo for ${c.title}`} className="max-h-[28rem] w-full rounded-xl2 border border-line object-cover" />}
          <Card title="Description">
            <p className="whitespace-pre-line">{c.description}</p>
            {c.safety_risk && (
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-critical"><ShieldAlert className="h-4 w-4" aria-hidden="true" />Flagged as a possible safety risk</p>
            )}
            {c.ai_description && (
              <div className="mt-4 rounded-lg bg-brand-soft p-4 text-sm">
                <p className="mb-1 flex items-center gap-2 font-semibold text-brand"><Sparkles className="h-4 w-4" aria-hidden="true" />AI description</p>
                <p className="whitespace-pre-line text-navy-700">{c.ai_description}</p>
              </div>
            )}
            <p className="mt-4 text-xs text-navy-500">Severity and priority are AI suggested and may be adjusted by an administrator.</p>
          </Card>
          <Card title="Location">
            {c.address && <p className="mb-3 text-sm">{c.address}</p>}
            {hasLocation ? (
              <MapView className="h-64 w-full" zoom={16} center={{ lat: c.latitude, lng: c.longitude }} markers={[{ id: c.id, lat: c.latitude, lng: c.longitude, severity: c.severity, title: c.title, status: c.status, category: c.category }]} />
            ) : <p className="text-sm text-navy-500">No location recorded.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Current status">
            <div className="rounded-lg border-l-4 bg-canvas p-4" style={{ borderColor: color }}>
              <p className="font-semibold">{c.status.replace('_', ' ').toLowerCase().replace(/^\w/, (m) => m.toUpperCase())}</p>
              <p className="mt-1 text-sm text-navy-500">{STATUS_DESCRIPTIONS[c.status]}</p>
            </div>
            <div className="mt-4 flex items-start gap-3 text-sm">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">Department</p>
                <p className="text-navy-500">{c.department || 'Not assigned yet'}</p>
              </div>
            </div>
          </Card>
          <Card title="Progress">
            <StatusTimeline status={c.status} updates={updates} createdAt={c.created_at} />
          </Card>
        </div>
      </div>
    </div>
  )
}
