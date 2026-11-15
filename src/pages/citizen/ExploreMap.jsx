import { useEffect, useMemo, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CATEGORIES, SEVERITIES, SEVERITY_COLORS, STATUS_LABELS } from '../../lib/constants'
import { fmtDate } from '../../lib/format'
import { useUserLocation } from '../../lib/useUserLocation'
import { Button, Select, useToast } from '../../components/ui'
import MapView from '../../components/MapView'

export default function ExploreMap() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const { location, status: locStatus, request } = useUserLocation()

  useEffect(() => {
    supabase.from('public_complaints').select('*').order('created_at', { ascending: false }).limit(1000)
      .then(({ data, error }) => {
        if (error) toast.error('Could not load the map data. Please refresh.')
        setRows(data ?? [])
        setLoading(false)
      })
  }, []) // eslint-disable-line

  useEffect(() => { if (locStatus === 'denied') toast.error('Location permission was denied. You can still pan and zoom the map.') }, [locStatus]) // eslint-disable-line

  const markers = useMemo(
    () => rows
      .filter((r) => (!category || r.category === category) && (!severity || r.severity === severity))
      .map((r) => ({
        id: r.id, lat: r.latitude, lng: r.longitude, severity: r.severity, title: r.title, status: r.status, category: r.category,
        popup: (
          <div className="text-sm">
            <strong className="block">{r.title}</strong>
            {r.is_demo && <span className="mb-1 inline-block rounded bg-slate-200 px-1.5 text-xs font-semibold">Demo data</span>}
            <span className="block">{r.category}</span>
            <span className="block">{STATUS_LABELS[r.status] ?? r.status}</span>
            <span className="block text-xs">{fmtDate(r.created_at)}</span>
          </div>
        ),
      })),
    [rows, category, severity]
  )

  return (
    <div className="page">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Explore map</h1>
          <p className="text-navy-500">Public view of reported issues. No personal details are shown.</p>
        </div>
        <Button variant="secondary" icon={LocateFixed} loading={locStatus === 'loading'} onClick={request}>My location</Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[14rem_12rem_1fr]">
        <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: '', label: 'All categories' }, ...CATEGORIES]} />
        <Select aria-label="Filter by severity" value={severity} onChange={(e) => setSeverity(e.target.value)} options={[{ value: '', label: 'All severities' }, ...SEVERITIES]} />
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm lg:justify-end" aria-label="Legend">
          {SEVERITIES.map((s) => (
            <li key={s} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: SEVERITY_COLORS[s] }} aria-hidden="true" />{s}</li>
          ))}
        </ul>
      </div>

      {loading ? <div className="skeleton h-[65vh] w-full" aria-label="Loading map" /> : (
        <MapView className="h-[65vh] min-h-80 w-full" markers={markers} center={location ?? undefined} userLocation={location} zoom={location ? 14 : 12} />
      )}
      <p className="mt-2 text-sm text-navy-500" aria-live="polite">{loading ? '' : `${markers.length} issue${markers.length === 1 ? '' : 's'} shown.`}</p>
    </div>
  )
}
