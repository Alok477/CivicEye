// src/pages/admin/Complaints.jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Inbox } from 'lucide-react'
import { getComplaints, updateComplaint } from '../../lib/adminApi'
import {
  SeverityBadge,
  StatusBadge,
  STATUSES,
  STATUS_LABELS,
  SEVERITIES,
  CATEGORIES,
  DEPARTMENTS,
  fieldCls,
  btnPrimary,
  btnSecondary,
  cardCls,
  formatShortDate,
  useNotify,
} from '../../components/admin/adminUi'
import DemoToggle from '../../components/admin/DemoToggle'

const PAGE_SIZE = 10
const DEFAULTS = {
  search: '',
  category: '',
  severity: '',
  status: '',
  department: '',
  duplicatesOnly: false,
  demo: 'all',
  sort: 'date',
  dir: 'desc',
  page: 1,
}
const label = (s) => STATUS_LABELS?.[s] || s.replace(/_/g, ' ')

function SortTh({ children, sortKey, f, onSort }) {
  const active = f.sort === sortKey
  return (
    <th scope="col" aria-sort={active ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-3 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 rounded outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
      >
        {children}
        <ArrowUpDown size={13} aria-hidden="true" className={active ? 'text-brand' : 'text-slate-400'} />
      </button>
    </th>
  )
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="border-t border-slate-100">
      {Array.from({ length: 9 }).map((__, j) => (
        <td key={j} className="px-3 py-4">
          <div className="h-4 animate-pulse rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  ))
}

export default function Complaints() {
  const notify = useNotify()
  const [f, setF] = useState(DEFAULTS)
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const reqRef = useRef(0)

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim()
      setF((p) => (p.search === next ? p : { ...p, search: next, page: 1 }))
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    const id = ++reqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await getComplaints({ ...f, pageSize: PAGE_SIZE })
      if (id === reqRef.current) setData(res)
    } catch (e) {
      if (id === reqRef.current) setError(e)
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }, [f])

  useEffect(() => {
    load()
  }, [load])

  const setFilter = (key, value) => setF((p) => ({ ...p, [key]: value, page: 1 }))
  const toggleSort = (key) =>
    setF((p) => ({ ...p, sort: key, dir: p.sort === key && p.dir === 'desc' ? 'asc' : 'desc', page: 1 }))
  const clearAll = () => {
    setSearchInput('')
    setF((p) => ({ ...DEFAULTS, demo: p.demo }))
  }

  const hasFilters = f.search || f.category || f.severity || f.status || f.department || f.duplicatesOnly
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  async function quickStatus(row, newStatus) {
    if (newStatus === row.status) return
    const prev = row.status
    setBusyId(row.id)
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)) }))
    try {
      const updated = await updateComplaint(row.id, { status: newStatus })
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === row.id ? { ...r, ...updated } : r)) }))
      notify.success(`${row.complaint_number} moved to ${label(newStatus)}`)
    } catch (e) {
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === row.id ? { ...r, status: prev } : r)) }))
      notify.error(e.offline ? e.message : `Could not update ${row.complaint_number}: ${e.message}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Complaints</h1>
          <p className="text-sm text-slate-500" aria-live="polite">
            {loading ? 'Loading complaints' : `${data.total} complaint${data.total === 1 ? '' : 's'} match your filters`}
          </p>
        </div>
        <DemoToggle value={f.demo} onChange={(v) => setFilter('demo', v)} />
      </div>

      {/* Filters */}
      <div className={`${cardCls} p-4`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <label htmlFor="c-search" className="sr-only">Search complaints</label>
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="c-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, number or address"
              className={`${fieldCls} pl-9`}
            />
          </div>
          {[
            ['c-cat', 'Category', 'category', CATEGORIES],
            ['c-sev', 'Severity', 'severity', SEVERITIES],
            ['c-stat', 'Status', 'status', STATUSES],
            ['c-dept', 'Department', 'department', DEPARTMENTS],
          ].map(([id, name, key, opts]) => (
            <div key={id}>
              <label htmlFor={id} className="sr-only">{name}</label>
              <select id={id} value={f[key]} onChange={(e) => setFilter(key, e.target.value)} className={fieldCls}>
                <option value="">{name}: all</option>
                {opts.map((o) => (
                  <option key={o} value={o}>{key === 'status' ? label(o) : o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={f.duplicatesOnly}
              onChange={(e) => setFilter('duplicatesOnly', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand"
            />
            Possible duplicates only
          </label>
          {hasFilters && (
            <button type="button" onClick={clearAll} className="text-sm font-medium text-brand hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`${cardCls} overflow-hidden`}>
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="font-medium text-[#DC2626]">Could not load complaints</p>
            <p className="max-w-md text-sm text-slate-600">{error.message}</p>
            <button type="button" onClick={load} className={btnPrimary}>
              <RefreshCw size={15} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <caption className="sr-only">Complaints</caption>
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Number</th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Title</th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Category</th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Location</th>
                  <SortTh sortKey="priority" f={f} onSort={toggleSort}>Severity</SortTh>
                  <SortTh sortKey="date" f={f} onSort={toggleSort}>Submitted</SortTh>
                  <SortTh sortKey="status" f={f} onSort={toggleSort}>Status</SortTh>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Department</th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.rows.length === 0 ? (
                  <SkeletonRows />
                ) : data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-16 text-center">
                      <Inbox size={28} aria-hidden="true" className="mx-auto text-slate-400" />
                      <p className="mt-2 font-medium text-slate-700">No complaints found</p>
                      <p className="text-sm text-slate-500">
                        {hasFilters ? 'Try removing a filter or changing your search.' : 'New reports will appear here as citizens submit them.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.id} className={`border-t border-slate-100 hover:bg-slate-50 ${loading ? 'opacity-60' : ''}`}>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-600">{r.complaint_number}</td>
                      <td className="max-w-[260px] px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/admin/complaints/${r.id}`} className="font-medium text-navy hover:text-brand hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand rounded">
                            {r.title}
                          </Link>
                          {r.safety_risk && (
                            <span title="Safety risk flagged" className="inline-flex text-[#DC2626]">
                              <AlertTriangle size={15} aria-hidden="true" />
                              <span className="sr-only">Safety risk</span>
                            </span>
                          )}
                          {r.is_demo && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Demo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{r.category}</td>
                      <td className="max-w-[200px] truncate px-3 py-3 text-slate-600" title={r.address || ''}>
                        {r.address || (r.latitude != null ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : '-')}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={r.severity} />
                          {r.priority_score != null && <span className="text-xs text-slate-500">{r.priority_score}</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatShortDate(r.created_at)}</td>
                      <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-3 text-slate-700">{r.department || <span className="text-slate-400">Unassigned</span>}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/complaints/${r.id}`} className={`${btnSecondary} px-2.5 py-1.5 text-xs`}>Review</Link>
                          <label className="sr-only" htmlFor={`qs-${r.id}`}>Change status of {r.complaint_number}</label>
                          <select
                            id={`qs-${r.id}`}
                            value={r.status}
                            disabled={busyId === r.id}
                            onChange={(e) => quickStatus(r, e.target.value)}
                            className={`${fieldCls} w-auto px-2 py-1.5 text-xs`}
                          >
                            {STATUSES.map((s) => (
                              <option
                                key={s}
                                value={s}
                                // Assigning needs a department; rejecting needs remarks, so both go through the review page
                                disabled={s === 'REJECTED' || (s === 'ASSIGNED' && !r.department && r.status !== 'ASSIGNED')}
                              >
                                {label(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!error && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <p>
              Showing {(f.page - 1) * PAGE_SIZE + 1}-{Math.min(f.page * PAGE_SIZE, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className={btnSecondary} disabled={f.page <= 1} onClick={() => setF((p) => ({ ...p, page: p.page - 1 }))}>
                <ChevronLeft size={15} aria-hidden="true" /> Previous
              </button>
              <span aria-live="polite">Page {f.page} of {totalPages}</span>
              <button type="button" className={btnSecondary} disabled={f.page >= totalPages} onClick={() => setF((p) => ({ ...p, page: p.page + 1 }))}>
                Next <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">To assign a department or reject with remarks, open the review page.</p>
    </div>
  )
}
