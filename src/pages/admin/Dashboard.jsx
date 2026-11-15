// src/pages/admin/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Clock,
  Wrench,
  CheckCircle2,
  AlertOctagon,
  Timer,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import MapView from '../../components/MapView'
import { getAllComplaints, getDailySummary } from '../../lib/adminApi'
import useStats from '../../components/admin/useStats'
import KpiCard from '../../components/admin/KpiCard'
import ChartCard from '../../components/admin/ChartCard'
import DemoToggle from '../../components/admin/DemoToggle'
import { ErrorBlock, Skeleton, NoData } from '../../components/admin/StateBlocks'
import { CategoryChart, SeverityChart, StatusChart, TimeChart } from '../../components/admin/charts'
import {
  SeverityBadge,
  StatusBadge,
  STATUS_LABELS,
  btnSecondary,
  cardCls,
  formatDate,
  formatHours,
  formatShortDate,
} from '../../components/admin/adminUi'

const OPEN = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS']
const label = (s) => STATUS_LABELS?.[s] || (s ? s.replace(/_/g, ' ') : '')

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [demo, setDemo] = useState('all')
  const { stats, loading, error, reload } = useStats(demo)

  // open complaints for the map preview
  const [mapData, setMapData] = useState({ rows: [], loading: true, error: null })
  const loadMap = useCallback(async () => {
    setMapData((m) => ({ ...m, loading: true, error: null }))
    try {
      const rows = await getAllComplaints({ demo })
      setMapData({ rows, loading: false, error: null })
    } catch (e) {
      setMapData({ rows: [], loading: false, error: e })
    }
  }, [demo])
  useEffect(() => {
    loadMap()
  }, [loadMap])

  // optional AI daily summary: hidden if the function is unavailable
  const [summary, setSummary] = useState(null)
  useEffect(() => {
    let alive = true
    getDailySummary()
      .then((s) => alive && s?.summary && setSummary(s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const markers = useMemo(
    () =>
      mapData.rows
        .filter((c) => OPEN.includes(c.status) && c.latitude != null && c.longitude != null)
        .map((c) => ({
          id: c.id,
          lat: c.latitude,
          lng: c.longitude,
          severity: c.severity,
          title: c.title,
          status: c.status,
          category: c.category,
        })),
    [mapData.rows],
  )
  const mapCenter = useMemo(() => {
    if (!markers.length) return [28.6139, 77.209]
    return [
      markers.reduce((s, m) => s + m.lat, 0) / markers.length,
      markers.reduce((s, m) => s + m.lng, 0) / markers.length,
    ]
  }, [markers])

  const refresh = () => {
    reload()
    loadMap()
  }

  const t = stats?.totals
  const avg = t ? formatHours(t.avgResolutionHours) : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
          <p className="text-sm text-slate-500">Live overview of reported civic issues.</p>
        </div>
        <div className="flex items-center gap-2">
          <DemoToggle value={demo} onChange={setDemo} />
          <button type="button" onClick={refresh} className={btnSecondary} aria-label="Refresh dashboard">
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} title="Could not load dashboard statistics" />
      ) : (
        <>
          {summary && (
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4" aria-label="AI daily civic intelligence">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
                <Sparkles size={15} aria-hidden="true" className="text-brand" /> AI daily civic intelligence
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{summary.summary}</p>
              {summary.generated_at && <p className="mt-1 text-xs text-slate-500">Generated {formatDate(summary.generated_at)}</p>}
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total complaints" value={t?.total} icon={ClipboardList} loading={loading} />
            <KpiCard label="Pending" value={t?.pending} icon={Clock} hint="Submitted or under review" loading={loading} />
            <KpiCard label="In progress" value={t?.inProgress} icon={Wrench} hint="Assigned or in progress" loading={loading} />
            <KpiCard label="Resolved" value={t?.resolved} icon={CheckCircle2} loading={loading} />
            <KpiCard label="Critical + High open" value={t?.criticalHighOpen} icon={AlertOctagon} tone="danger" loading={loading} />
            <KpiCard
              label="Avg resolution time"
              value={avg || 'Not enough data yet'}
              icon={Timer}
              hint={t ? `Based on ${t.resolvedSample} resolved` : undefined}
              loading={loading}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Complaints by category" loading={loading}>
              <CategoryChart data={stats?.byCategory} />
            </ChartCard>
            <ChartCard title="Complaints by severity" loading={loading}>
              <SeverityChart data={stats?.bySeverity} />
            </ChartCard>
            <ChartCard title="Complaints by status" loading={loading}>
              <StatusChart data={stats?.byStatus} />
            </ChartCard>
            <ChartCard title="Complaints over time" subtitle="Submitted per day, last 30 days" loading={loading}>
              <TimeChart data={stats?.overTime} />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={`${cardCls} p-4 sm:p-5 lg:col-span-2`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">Open complaints map</h2>
                  <p className="text-xs text-slate-500">{mapData.loading ? 'Loading' : `${markers.length} open complaints with a location`}</p>
                </div>
                <Link to="/admin/map" className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  Open full map <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              {mapData.loading ? (
                <Skeleton className="h-72 w-full" />
              ) : mapData.error ? (
                <div role="alert" className="flex h-72 flex-col items-center justify-center gap-2 text-center text-sm">
                  <p className="text-[#DC2626]">Could not load map data</p>
                  <p className="text-slate-600">{mapData.error.message}</p>
                  <button type="button" onClick={loadMap} className={btnSecondary}>Try again</button>
                </div>
              ) : markers.length === 0 ? (
                <div className="h-72"><NoData title="No open complaints with a location" text="Open complaints appear here coloured by severity." /></div>
              ) : (
                <div className="h-72 overflow-hidden rounded-lg border border-slate-200">
                  <MapView
                    key={`${demo}-${markers.length}`}
                    center={mapCenter}
                    markers={markers}
                    onMarkerClick={(m) => navigate(`/admin/complaints/${typeof m === 'object' ? m.id : m}`)}
                  />
                </div>
              )}
            </section>

            <section className={`${cardCls} p-4 sm:p-5`}>
              <h2 className="text-base font-semibold text-navy">Recent activity</h2>
              {loading ? (
                <div className="mt-3 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !stats?.recentActivity.length ? (
                <div className="mt-3"><NoData title="No activity yet" text="Status changes show up here." /></div>
              ) : (
                <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {stats.recentActivity.map((a) => (
                    <li key={a.id} className="text-sm">
                      <Link to={`/admin/complaints/${a.complaint_id}`} className="font-medium text-navy hover:text-brand hover:underline">
                        {a.complaint_number || 'Complaint'}
                      </Link>
                      <span className="text-slate-600">
                        {' '}
                        {a.previous_status ? `${label(a.previous_status)} to ${label(a.new_status)}` : `submitted as ${label(a.new_status)}`}
                      </span>
                      {a.remarks && <p className="truncate text-xs text-slate-500">"{a.remarks}"</p>}
                      <p className="text-xs text-slate-400" title={formatDate(a.created_at)}>{timeAgo(a.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={`${cardCls} overflow-hidden`}>
            <div className="flex items-center justify-between p-4 sm:px-5">
              <h2 className="text-base font-semibold text-navy">Recent complaints</h2>
              <Link to="/admin/complaints" className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand">
                View all <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <caption className="sr-only">Latest complaints</caption>
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    {['Number', 'Title', 'Category', 'Severity', 'Status', 'Submitted'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1, 2, 3, 4].map((i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                      </tr>
                    ))
                  ) : !stats?.recentComplaints.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No complaints yet.</td>
                    </tr>
                  ) : (
                    stats.recentComplaints.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">{c.complaint_number}</td>
                        <td className="max-w-[260px] px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link to={`/admin/complaints/${c.id}`} className="truncate font-medium text-navy hover:text-brand hover:underline">{c.title}</Link>
                            {c.safety_risk && <AlertTriangle size={14} aria-label="Safety risk" className="shrink-0 text-[#DC2626]" />}
                            {c.is_demo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Demo</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.category}</td>
                        <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatShortDate(c.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
