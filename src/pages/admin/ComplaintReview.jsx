// src/pages/admin/ComplaintReview.jsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  ImageOff,
  Check,
  MapPin,
  RefreshCw,
  Sparkles,
  Copy,
} from 'lucide-react'
import MapView from '../../components/MapView'
import {
  getComplaint,
  getComplaintUpdates,
  getDuplicates,
  updateComplaint,
  resolveDuplicate,
} from '../../lib/adminApi'
import {
  SeverityBadge,
  StatusBadge,
  Modal,
  STATUSES,
  STATUS_LABELS,
  SEVERITIES,
  CATEGORIES,
  DEPARTMENTS,
  fieldCls,
  btnPrimary,
  btnSecondary,
  cardCls,
  formatDate,
  useNotify,
} from '../../components/admin/adminUi'

const LIFECYCLE = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
const label = (s) => STATUS_LABELS?.[s] || (s ? s.replace(/_/g, ' ') : '-')
const pct = (v) => (v == null ? null : Math.round((v <= 1 ? v * 100 : v)))

function Section({ title, children, aside }) {
  return (
    <section className={`${cardCls} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Stepper({ status }) {
  const idx = LIFECYCLE.indexOf(status)
  const terminal = idx === -1
  return (
    <div>
      <ol className="flex items-start" aria-label="Complaint lifecycle">
        {LIFECYCLE.map((s, i) => {
          const done = !terminal && i < idx
          const current = !terminal && i === idx
          return (
            <li key={s} className="relative flex-1 text-center" aria-current={current ? 'step' : undefined}>
              {i > 0 && (
                <span aria-hidden="true" className={`absolute left-[-50%] right-[50%] top-4 h-0.5 ${!terminal && i <= idx ? 'bg-brand' : 'bg-slate-200'}`} />
              )}
              <span
                className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  done ? 'border-brand bg-brand text-white' : current ? 'border-brand bg-surface text-brand' : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`mt-1.5 block text-[11px] leading-tight sm:text-xs ${current ? 'font-semibold text-navy' : 'text-slate-500'}`}>
                {label(s)}
              </span>
            </li>
          )
        })}
      </ol>
      {terminal && (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          This complaint is closed as <strong>{label(status)}</strong>.
        </p>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading complaint">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[200, 160, 220].map((h) => (
            <div key={h} className="animate-pulse rounded-xl bg-slate-200" style={{ height: h }} />
          ))}
        </div>
        <div className="space-y-4">
          {[320, 220].map((h) => (
            <div key={h} className="animate-pulse rounded-xl bg-slate-200" style={{ height: h }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ComplaintReview() {
  const { id } = useParams()
  const notify = useNotify()

  const [complaint, setComplaint] = useState(null)
  const [updates, setUpdates] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [dupLoading, setDupLoading] = useState(true)
  const [dupError, setDupError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dupBusy, setDupBusy] = useState(null)
  const [markDup, setMarkDup] = useState(true)
  const [zoom, setZoom] = useState(false)

  // drafts
  const [sevDraft, setSevDraft] = useState('')
  const [catDraft, setCatDraft] = useState('')
  const [deptDraft, setDeptDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('')
  const [remarks, setRemarks] = useState('')
  const [remarksError, setRemarksError] = useState('')

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        const [c, u] = await Promise.all([getComplaint(id), getComplaintUpdates(id)])
        setComplaint(c)
        setUpdates(u)
      } catch (e) {
        setError(e)
        setLoading(false)
        return
      }
      setLoading(false)
      setDupLoading(true)
      try {
        setDuplicates(await getDuplicates(id))
        setDupError(null)
      } catch (e) {
        setDupError(e)
      } finally {
        setDupLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!complaint) return
    setSevDraft(complaint.severity || '')
    setCatDraft(complaint.category || '')
    setDeptDraft(complaint.department || '')
    setStatusDraft(complaint.status)
  }, [complaint?.id, complaint?.status, complaint?.severity, complaint?.category, complaint?.department]) // eslint-disable-line react-hooks/exhaustive-deps

  // All writes go through updateComplaint (update-status). Optimistic UI with rollback.
  async function run(patch, okMessage) {
    if (saving || !complaint) return false
    const before = complaint
    const statusChanged = patch.status && patch.status !== before.status
    setSaving(true)
    setComplaint((c) => ({
      ...c,
      ...(patch.status && { status: patch.status }),
      ...(patch.severity && { severity: patch.severity }),
      ...(patch.category && { category: patch.category }),
      ...(patch.department && { department: patch.department }),
    }))
    if (statusChanged || patch.remarks) {
      setUpdates((u) => [
        ...u,
        {
          id: `tmp-${Date.now()}`,
          complaint_id: id,
          previous_status: before.status,
          new_status: patch.status || before.status,
          remarks: patch.remarks || null,
          created_at: new Date().toISOString(),
        },
      ])
    }
    try {
      const row = await updateComplaint(id, patch)
      setComplaint((c) => ({ ...c, ...row }))
      setUpdates(await getComplaintUpdates(id))
      setRemarks('')
      setRemarksError('')
      notify.success(okMessage)
      return true
    } catch (e) {
      setComplaint(before)
      setUpdates((u) => u.filter((x) => !String(x.id).startsWith('tmp-')))
      notify.error(e.offline ? e.message : `Update failed: ${e.message}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  const confirmComplaint = () => run({ status: 'UNDER_REVIEW' }, 'Complaint confirmed. Now under review.')
  const markResolved = () => run({ status: 'RESOLVED', remarks: remarks.trim() || undefined }, 'Complaint marked as resolved.')
  const assign = () => {
    if (!deptDraft) return
    const status = ['SUBMITTED', 'UNDER_REVIEW'].includes(complaint.status) ? 'ASSIGNED' : complaint.status
    run({ department: deptDraft, status }, `Assigned to ${deptDraft}.`)
  }
  const saveClassification = () => {
    const patch = {}
    if (sevDraft && sevDraft !== complaint.severity) patch.severity = sevDraft
    if (catDraft && catDraft !== complaint.category) patch.category = catDraft
    run(patch, 'Classification updated.')
  }
  const updateStatus = () => {
    if (statusDraft === 'REJECTED' && !remarks.trim()) {
      setRemarksError('Add remarks explaining why this complaint is rejected.')
      return
    }
    run({ status: statusDraft, remarks: remarks.trim() || undefined }, `Status changed to ${label(statusDraft)}.`)
  }

  async function dupAction(d, action) {
    setDupBusy(`${d.complaint.id}:${action}`)
    try {
      await resolveDuplicate(d.relationId, action, {
        complaintId: id,
        relatedId: d.complaint.id,
        similarity: d.similarity_score,
        incidentGroupId: complaint.incident_group_id,
        complaintNumber: complaint.complaint_number,
        markDuplicate: markDup,
      })
      notify.success(
        action === 'MERGE'
          ? `${d.complaint.complaint_number} merged into this incident.`
          : action === 'SEPARATE'
            ? `${d.complaint.complaint_number} marked as a separate issue.`
            : `${d.complaint.complaint_number} left pending.`,
      )
      await load(true)
    } catch (e) {
      notify.error(e.offline ? e.message : `Could not update the duplicate review: ${e.message}`)
    } finally {
      setDupBusy(null)
    }
  }

  if (loading) return <LoadingSkeleton />

  if (error || !complaint) {
    return (
      <div className="space-y-4">
        <Link to="/admin/complaints" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
          <ArrowLeft size={15} aria-hidden="true" /> Back to complaints
        </Link>
        <div role="alert" className={`${cardCls} flex flex-col items-center gap-3 p-10 text-center`}>
          <p className="font-medium text-[#DC2626]">{error?.status === 404 ? 'Complaint not found' : 'Could not load this complaint'}</p>
          <p className="max-w-md text-sm text-slate-600">{error?.message}</p>
          <button type="button" onClick={() => load()} className={btnPrimary}>
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    )
  }

  const closed = ['RESOLVED', 'REJECTED', 'DUPLICATE'].includes(complaint.status)
  const hasCoords = complaint.latitude != null && complaint.longitude != null
  const mergedCount = duplicates.filter((d) => d.review_status === 'MERGED').length
  const linkedReports = mergedCount > 0 || complaint.incident_group_id ? mergedCount + 1 : 0
  const classificationChanged = sevDraft !== complaint.severity || catDraft !== complaint.category
  const conf = pct(complaint.ai_confidence)

  return (
    <div className="space-y-4">
      <Link to="/admin/complaints" className="inline-flex items-center gap-1 rounded text-sm text-brand hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <ArrowLeft size={15} aria-hidden="true" /> Back to complaints
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-slate-500">{complaint.complaint_number}</span>
            {complaint.is_demo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Demo</span>}
            {complaint.safety_risk && (
              <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-[#DC2626]">
                <AlertTriangle size={13} aria-hidden="true" /> Safety risk
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-navy">{complaint.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={complaint.severity} />
          <StatusBadge status={complaint.status} />
        </div>
      </header>

      <div className={`${cardCls} p-4 sm:p-5`}>
        <Stepper status={complaint.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* LEFT: evidence and history */}
        <div className="space-y-4 lg:col-span-2">
          <Section title="Report">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                {complaint.image_url ? (
                  <button
                    type="button"
                    onClick={() => setZoom(true)}
                    className="group block w-full overflow-hidden rounded-lg border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    aria-label="Enlarge photograph"
                  >
                    <img src={complaint.image_url} alt={`Photo submitted for ${complaint.title}`} className="h-52 w-full object-cover transition group-hover:scale-[1.02]" />
                  </button>
                ) : (
                  <div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImageOff size={26} aria-hidden="true" />
                    <span className="mt-1 text-sm">No photograph submitted</span>
                  </div>
                )}
                {complaint.audio_url && (
                  <audio controls src={complaint.audio_url} className="mt-3 w-full" aria-label="Voice note from citizen" />
                )}
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Citizen description</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{complaint.description || 'No description provided.'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Sparkles size={12} aria-hidden="true" /> AI-generated description
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{complaint.ai_description || 'No AI description stored.'}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Reported by</dt>
                    <dd className="mt-0.5 text-slate-800">{complaint.users?.name || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Submitted</dt>
                    <dd className="mt-0.5 text-slate-800">{formatDate(complaint.created_at)}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </Section>

          <Section title="AI analysis" aside={<span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">AI suggested</span>}>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium text-slate-500">Severity</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <SeverityBadge severity={complaint.severity} />
                  {complaint.priority_score != null && <span className="text-slate-600">{complaint.priority_score}/100</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">AI confidence</dt>
                <dd className="mt-1 text-slate-800">{conf != null ? `${conf}%` : 'Not available'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Category</dt>
                <dd className="mt-1 text-slate-800">{complaint.category || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Subcategory</dt>
                <dd className="mt-1 text-slate-800">{complaint.subcategory || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Safety risk</dt>
                <dd className={`mt-1 ${complaint.safety_risk ? 'font-medium text-[#DC2626]' : 'text-slate-800'}`}>{complaint.safety_risk ? 'Flagged' : 'None flagged'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Suggested department</dt>
                <dd className="mt-1 text-slate-800">{complaint.department || 'None yet'}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">AI output is a recommendation. Use the controls to override severity or category.</p>
          </Section>

          <Section title="Location">
            <p className="flex items-start gap-2 text-sm text-slate-800">
              <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
              <span>
                {complaint.address || 'No address recorded'}
                {hasCoords && <span className="block text-xs text-slate-500">{Number(complaint.latitude).toFixed(5)}, {Number(complaint.longitude).toFixed(5)}</span>}
              </span>
            </p>
            {hasCoords ? (
              <div className="mt-3 h-60 overflow-hidden rounded-lg border border-slate-200">
                <MapView
                  center={[complaint.latitude, complaint.longitude]}
                  markers={[
                    {
                      id: complaint.id,
                      lat: complaint.latitude,
                      lng: complaint.longitude,
                      severity: complaint.severity,
                      title: complaint.title,
                      status: complaint.status,
                      category: complaint.category,
                    },
                  ]}
                />
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No coordinates were captured for this complaint.</p>
            )}
          </Section>

          <Section title="Status history">
            {updates.length === 0 ? (
              <p className="text-sm text-slate-500">No history yet.</p>
            ) : (
              <ol className="relative ml-2 space-y-4 border-l border-slate-200 pl-5">
                {[...updates].reverse().map((u) => (
                  <li key={u.id} className="relative">
                    <span aria-hidden="true" className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand ring-1 ring-slate-200" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {u.previous_status && (
                        <>
                          <span className="text-slate-500">{label(u.previous_status)}</span>
                          <span aria-hidden="true" className="text-slate-400">to</span>
                          <span className="sr-only">changed to</span>
                        </>
                      )}
                      <StatusBadge status={u.new_status} />
                    </div>
                    {u.remarks && <p className="mt-1 text-sm text-slate-700">"{u.remarks}"</p>}
                    <p className="mt-0.5 text-xs text-slate-500">{formatDate(u.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {/* RIGHT: actions and duplicates */}
        <div className="space-y-4">
          <Section title="Actions">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {complaint.status === 'SUBMITTED' && (
                  <button type="button" className={btnPrimary} onClick={confirmComplaint} disabled={saving}>
                    <Check size={15} aria-hidden="true" /> Confirm complaint
                  </button>
                )}
                {!closed && (
                  <button type="button" className={btnSecondary} onClick={markResolved} disabled={saving}>
                    Mark resolved
                  </button>
                )}
                {closed && complaint.status !== 'RESOLVED' && <p className="text-sm text-slate-500">This complaint is closed. Change the status below to reopen it.</p>}
              </div>

              <div>
                <label htmlFor="dept" className="mb-1 block text-xs font-medium text-slate-600">Assign department</label>
                <div className="flex gap-2">
                  <select id="dept" className={fieldCls} value={deptDraft} onChange={(e) => setDeptDraft(e.target.value)} disabled={saving}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button type="button" className={btnPrimary} onClick={assign} disabled={saving || !deptDraft || deptDraft === complaint.department}>
                    Assign
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Current: {complaint.department || 'Unassigned'}. Assigning moves the complaint to Assigned.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Override AI classification</p>
                <label htmlFor="sev" className="sr-only">Severity</label>
                <select id="sev" className={fieldCls} value={sevDraft} onChange={(e) => setSevDraft(e.target.value)} disabled={saving}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <label htmlFor="cat" className="sr-only">Category</label>
                <select id="cat" className={fieldCls} value={catDraft} onChange={(e) => setCatDraft(e.target.value)} disabled={saving}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="button" className={btnSecondary} onClick={saveClassification} disabled={saving || !classificationChanged}>
                  Save classification
                </button>
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="block text-xs font-medium text-slate-600">Update status</label>
                <select id="status" className={fieldCls} value={statusDraft} onChange={(e) => { setStatusDraft(e.target.value); setRemarksError('') }} disabled={saving}>
                  {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <label htmlFor="remarks" className="block text-xs font-medium text-slate-600">
                  Administrator remarks{statusDraft === 'REJECTED' ? ' (required)' : ' (optional)'}
                </label>
                <textarea
                  id="remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => { setRemarks(e.target.value); setRemarksError('') }}
                  aria-invalid={!!remarksError}
                  aria-describedby={remarksError ? 'remarks-err' : undefined}
                  className={`${fieldCls} ${remarksError ? 'border-[#DC2626]' : ''}`}
                  placeholder="Visible to the citizen in their timeline"
                  disabled={saving}
                />
                {remarksError && <p id="remarks-err" role="alert" className="text-xs text-[#DC2626]">{remarksError}</p>}
                <button type="button" className={btnPrimary} onClick={updateStatus} disabled={saving || (statusDraft === complaint.status && !remarks.trim())}>
                  {saving ? 'Saving...' : 'Update status'}
                </button>
              </div>
            </div>
          </Section>

          <Section title="Potential duplicates" aside={linkedReports > 0 && <span className="text-xs text-slate-500">{linkedReports} reports linked to this incident</span>}>
            {dupLoading ? (
              <div className="space-y-2" aria-busy="true">
                {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />)}
              </div>
            ) : dupError ? (
              <div role="alert" className="text-sm">
                <p className="text-[#DC2626]">Could not check for duplicates.</p>
                <p className="text-slate-600">{dupError.message}</p>
                <button type="button" className={`${btnSecondary} mt-2`} onClick={() => load(true)}>Try again</button>
              </div>
            ) : duplicates.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Copy size={15} aria-hidden="true" /> No similar reports nearby.
              </p>
            ) : (
              <div className="space-y-3">
                <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={markDup} onChange={(e) => setMarkDup(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
                  When merging, also set the merged report's status to Duplicate. Reports are never deleted.
                </label>
                <ul className="space-y-3">
                  {duplicates.map((d) => {
                    const c = d.complaint
                    const merged = d.review_status === 'MERGED'
                    const separate = d.review_status === 'SEPARATE'
                    return (
                      <li key={c.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex gap-3">
                          {c.image_url ? (
                            <img src={c.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400">
                              <ImageOff size={18} aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <Link to={`/admin/complaints/${c.id}`} className="block truncate text-sm font-medium text-navy hover:text-brand hover:underline">
                              {c.title}
                            </Link>
                            <p className="font-mono text-xs text-slate-500">{c.complaint_number}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              {d.similarity_score != null && <span>{Math.round(d.similarity_score * 100)}% similar</span>}
                              {d.distance_m != null && <span>{d.distance_m} m away</span>}
                              <StatusBadge status={c.status} />
                            </div>
                          </div>
                        </div>
                        {(merged || separate) && (
                          <p className={`mt-2 text-xs font-medium ${merged ? 'text-brand' : 'text-slate-600'}`}>
                            {merged ? 'Merged into this incident' : 'Marked as separate'}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className={`${btnPrimary} px-2.5 py-1.5 text-xs`} onClick={() => dupAction(d, 'MERGE')} disabled={!!dupBusy || merged}>
                            Merge into this incident
                          </button>
                          <button type="button" className={`${btnSecondary} px-2.5 py-1.5 text-xs`} onClick={() => dupAction(d, 'SEPARATE')} disabled={!!dupBusy || separate}>
                            Mark as separate
                          </button>
                          <button type="button" className={`${btnSecondary} px-2.5 py-1.5 text-xs`} onClick={() => dupAction(d, 'PENDING')} disabled={!!dupBusy || (!merged && !separate)}>
                            Keep pending
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </Section>
        </div>
      </div>

      <Modal open={zoom} onClose={() => setZoom(false)} title="Submitted photograph">
        {complaint.image_url && <img src={complaint.image_url} alt={`Photo submitted for ${complaint.title}`} className="max-h-[75vh] w-full object-contain" />}
      </Modal>
    </div>
  )
}
