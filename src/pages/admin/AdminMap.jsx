// src/pages/admin/AdminMap.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Flame } from 'lucide-react'
import MapView from '../../components/MapView'
import { getAllComplaints } from '../../lib/adminApi'
import DemoToggle from '../../components/admin/DemoToggle'
import { ErrorBlock, Skeleton, NoData } from '../../components/admin/StateBlocks'
import { SEV_COLORS } from '../../components/admin/charts'
import {
  StatusBadge,
  SeverityBadge,
  STATUSES,
  STATUS_LABELS,
  SEVERITIES,
  CATEGORIES,
  fieldCls,
  btnSecondary,
  cardCls,
} from '../../components/admin/adminUi'

const HOTSPOT_MIN = 3 // reports in one grid cell before it is listed
const DEFAULT_CENTER = [28.6139, 77.209]

export default function AdminMap() {
  const [demo, setDemo] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [f, setF] = useState({ category: '', severity: '', status: '' })
  const [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState({ center: null, key: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await getAllComplaints({ demo }))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [demo])
  useEffect(() => {
    load()
  }, [load])

  const withCoords = useMemo(() => rows.filter((c) => c.latitude != null && c.longitude != null), [rows])
  const visible = useMemo(
    () =>
      withCoords.filter(
        (c) =>
          (!f.category || c.category === f.category) &&
          (!f.severity || c.severity === f.severity) &&
          (!f.status || c.status === f.status),
      ),
    [withCoords, f],
  )

  const markers = useMemo(
    () =>
      visible.map((c) => ({
        id: c.id,
        lat: c.latitude,
        lng: c.longitude,
        severity: c.severity,
        title: c.title,
        status: c.status,
        category: c.category,
        popup: (
          <div style={{ minWidth: 170 }}>
            <strong>{c.title}</strong>
            <div style={{ fontSize: 12, margin: '4px 0' }}>
              {c.complaint_number} | {c.category}
              <br />
              {c.severity} | {STATUS_LABELS?.[c.status] || c.status}
            </div>
            <Link to={`/admin/complaints/${c.id}`}>Open review page</Link>
          </div>
        ),
      })),
    [visible],
  )

  // Simple concentration view: group visible complaints into ~1 km grid cells (0.01 degrees).
  const hotspots = useMemo(() => {
    const cells = new Map()
    visible.forEach((c) => {
      const key = `${Math.round(c.latitude * 100)}:${Math.round(c.longitude * 100)}`
      const cell = cells.get(key) || { count: 0, lat: 0, lng: 0, addresses: {} }
      cell.count += 1
      cell.lat += c.latitude
      cell.lng += c.longitude
      if (c.address) cell.addresses[c.address] = (cell.addresses[c.address] || 0) + 1
      cells.set(key, cell)
    })
    return [...cells.values()]
      .filter((c) => c.count >= HOTSPOT_MIN)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((c) => {
        const top = Object.entries(c.addresses).sort((a, b) => b[1] - a[1])[0]
        return { count: c.count, center: [c.lat / c.count, c.lng / c.count], label: top ? top[0] : `${(c.lat / c.count).toFixed(3)}, ${(c.lng / c.count).toFixed(3)}` }
      })
  }, [visible])

  const center = useMemo(() => {
    if (focus.center) return focus.center
    if (!visible.length) return DEFAULT_CENTER
    return [visible.reduce((s, c) => s + c.latitude, 0) / visible.length, visible.reduce((s, c) => s + c.longitude, 0) / visible.length]
  }, [focus.center, visible])

  const selected = visible.find((c) => c.id === selectedId)
  const missingCoords = rows.length - withCoords.length
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Map</h1>
          <p className="text-sm text-slate-500" aria-live="polite">
            {loading ? 'Loading complaints' : `Showing ${visible.length} of ${withCoords.length} complaints with a location`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoToggle value={demo} onChange={setDemo} />
          <button type="button" onClick={load} className={btnSecondary} aria-label="Refresh map">
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={load} title="Could not load map data" />
      ) : (
        <>
          <div className={`${cardCls} p-4`}>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['m-cat', 'Category', 'category', CATEGORIES],
                ['m-sev', 'Severity', 'severity', SEVERITIES],
                ['m-stat', 'Status', 'status', STATUSES],
              ].map(([id, name, key, opts]) => (
                <div key={id}>
                  <label htmlFor={id} className="sr-only">{name}</label>
                  <select id={id} value={f[key]} onChange={(e) => set(key, e.target.value)} className={fieldCls}>
                    <option value="">{name}: all</option>
                    {opts.map((o) => <option key={o} value={o}>{key === 'status' ? STATUS_LABELS?.[o] || o : o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Map legend">
              {Object.entries(SEV_COLORS).map(([name, color]) => (
                <li key={name} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {name}
                </li>
              ))}
              {missingCoords > 0 && <li className="text-slate-500">{missingCoords} complaint{missingCoords === 1 ? '' : 's'} without coordinates not shown</li>}
            </ul>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className={`${cardCls} overflow-hidden lg:col-span-3`}>
              {loading ? (
                <Skeleton className="h-[60vh] w-full" />
              ) : visible.length === 0 ? (
                <div className="h-[60vh]"><NoData title="No complaints to show" text="Change the filters or switch the data source." /></div>
              ) : (
                <div className="h-[60vh] min-h-[360px]">
                  <MapView
                    key={`${focus.key}-${demo}`}
                    center={center}
                    markers={markers}
                    onMarkerClick={(m) => setSelectedId(typeof m === 'object' ? m.id : m)}
                  />
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {selected && (
                <section className={`${cardCls} p-4`} aria-label="Selected complaint">
                  <p className="font-mono text-xs text-slate-500">{selected.complaint_number}</p>
                  <h2 className="mt-0.5 text-sm font-semibold text-navy">{selected.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2"><SeverityBadge severity={selected.severity} /><StatusBadge status={selected.status} /></div>
                  <p className="mt-2 text-xs text-slate-600">{selected.address || selected.category}</p>
                  <Link to={`/admin/complaints/${selected.id}`} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Open review page</Link>
                </section>
              )}

              <section className={`${cardCls} p-4`}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <Flame size={15} aria-hidden="true" className="text-[#EA580C]" /> Concentration areas
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Visible complaints counted in roughly 1 km grid cells. Cells with {HOTSPOT_MIN} or more reports are listed.
                </p>
                {loading ? (
                  <Skeleton className="mt-3 h-24 w-full" />
                ) : hotspots.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No area has {HOTSPOT_MIN} or more reports in the current view.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {hotspots.map((h) => (
                      <li key={h.label + h.count}>
                        <button
                          type="button"
                          onClick={() => setFocus((p) => ({ center: h.center, key: p.key + 1 }))}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <span className="truncate text-slate-800">{h.label}</span>
                          <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-[#EA580C]">{h.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
