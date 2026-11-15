// src/lib/adminApi.js
// Single place for every admin data call (live Supabase + Edge Functions only; the mock layer was removed in the merge).
import { supabase } from './supabase'

export const USE_MOCK = false // Merged build: mock data removed, always uses Supabase + Edge Functions

export class ApiError extends Error {
  constructor(message, { status, offline } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.offline = !!offline
  }
}

const LIFECYCLE = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
const STATUS_ORDER = [...LIFECYCLE, 'REJECTED', 'DUPLICATE']
const OPEN_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS']
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low']
const DEPARTMENTS = [
  'Road Maintenance',
  'Sanitation',
  'Electrical & Lighting',
  'Water Works',
  'Drainage & Sewerage',
  'Public Safety',
  'General Administration',
]
const MIN_RESOLVED_FOR_AVG = 3

// ---------- shared helpers ----------

export function haversineMeters(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null)) return null
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

const dayKey = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null)

function check({ data, error }) {
  if (error) throw new ApiError(error.message || 'Database request failed')
  return data
}

async function callFunction(name, { method = 'POST', body, query } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new ApiError('Your session has expired. Sign in again.', { status: 401 })
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  let res
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}${qs}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the backend. Check your connection and try again.', {
      offline: true,
    })
  }
  let payload = null
  try {
    payload = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError(payload?.error || payload?.message || `Request failed (${res.status})`, {
      status: res.status,
    })
  }
  return payload
}

// ---------- stats: computed from real records (used by mock and real) ----------

export function computeStats(complaints, updates, relations) {
  const byId = new Map(complaints.map((c) => [c.id, c]))
  const open = complaints.filter((c) => OPEN_STATUSES.includes(c.status))

  // resolution time: created_at -> latest RESOLVED history entry
  const resolvedAt = new Map()
  updates
    .filter((u) => u.new_status === 'RESOLVED')
    .forEach((u) => {
      const prev = resolvedAt.get(u.complaint_id)
      if (!prev || new Date(u.created_at) > new Date(prev)) resolvedAt.set(u.complaint_id, u.created_at)
    })
  const hoursByDept = {}
  const durations = []
  resolvedAt.forEach((ts, id) => {
    const c = byId.get(id)
    if (!c || c.status !== 'RESOLVED') return
    const h = (new Date(ts) - new Date(c.created_at)) / 36e5
    if (h < 0) return
    durations.push(h)
    const d = c.department || 'Unassigned'
    ;(hoursByDept[d] ||= []).push(h)
  })

  const count = (key, order) => {
    const m = {}
    complaints.forEach((c) => {
      const k = c[key] || 'Unassigned'
      m[k] = (m[k] || 0) + 1
    })
    const names = order ? [...order, ...Object.keys(m).filter((k) => !order.includes(k))] : Object.keys(m)
    const rows = names.map((name) => ({ name, value: m[name] || 0 }))
    return order ? rows : rows.sort((a, b) => b.value - a.value)
  }

  // last 30 days
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push({
      date: dayKey(d),
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      count: 0,
    })
  }
  const dayIdx = new Map(days.map((d, i) => [d.date, i]))
  complaints.forEach((c) => {
    const i = dayIdx.get(dayKey(c.created_at))
    if (i != null) days[i].count += 1
  })

  // top areas: group by address if present, otherwise rounded coordinates (~1 km)
  const areas = new Map()
  complaints.forEach((c) => {
    if (c.latitude == null && !c.address) return
    const key =
      c.latitude != null && c.longitude != null
        ? `${Number(c.latitude).toFixed(2)},${Number(c.longitude).toFixed(2)}`
        : c.address
    const a = areas.get(key) || { key, count: 0, addresses: {} }
    a.count += 1
    if (c.address) a.addresses[c.address] = (a.addresses[c.address] || 0) + 1
    areas.set(key, a)
  })
  const topAreas = [...areas.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((a) => {
      const best = Object.entries(a.addresses).sort((x, y) => y[1] - x[1])[0]
      return { label: best ? best[0] : a.key, count: a.count }
    })

  // department workload
  const deptNames = [...DEPARTMENTS, 'Unassigned']
  const departmentWorkload = deptNames
    .map((name) => {
      const mine = complaints.filter((c) => (c.department || 'Unassigned') === name)
      return {
        name,
        open: mine.filter((c) => OPEN_STATUSES.includes(c.status)).length,
        resolved: mine.filter((c) => c.status === 'RESOLVED').length,
        total: mine.length,
        avgResolutionHours:
          (hoursByDept[name] || []).length >= MIN_RESOLVED_FOR_AVG ? mean(hoursByDept[name]) : null,
      }
    })
    .filter((d) => d.total > 0)

  // duplicate reduction
  const groups = new Set(complaints.filter((c) => c.incident_group_id).map((c) => c.incident_group_id))
  const linkedReports = complaints.filter((c) => c.incident_group_id).length
  const duplicates = {
    linkedReports,
    incidentGroups: groups.size,
    reportsMergedAway: Math.max(0, linkedReports - groups.size),
    uniqueIncidents: complaints.length - Math.max(0, linkedReports - groups.size),
    pendingReviews: relations.filter((r) => r.review_status === 'PENDING').length,
  }

  return {
    totals: {
      total: complaints.length,
      pending: complaints.filter((c) => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length,
      inProgress: complaints.filter((c) => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length,
      resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
      criticalHighOpen: open.filter((c) => ['Critical', 'High'].includes(c.severity)).length,
      avgResolutionHours: durations.length >= MIN_RESOLVED_FOR_AVG ? mean(durations) : null, // null => "Not enough data yet"
      resolvedSample: durations.length,
    },
    byCategory: count('category'),
    bySeverity: count('severity', SEVERITY_ORDER),
    byStatus: count('status', STATUS_ORDER),
    overTime: days,
    topAreas,
    departmentWorkload,
    duplicates,
    recentComplaints: [...complaints]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8),
    recentActivity: [...updates]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map((u) => ({
        ...u,
        complaint_number: byId.get(u.complaint_id)?.complaint_number,
        title: byId.get(u.complaint_id)?.title,
      })),
  }
}

// ======================================================================
// REAL (Supabase client reads + Edge Function writes)
// ======================================================================

const SLIM_COLS =
  'id,complaint_number,title,category,severity,priority_score,status,department,latitude,longitude,address,incident_group_id,is_demo,safety_risk,image_url,created_at'

const withDemo = (q, demo) => (demo === 'real' ? q.eq('is_demo', false) : demo === 'demo' ? q.eq('is_demo', true) : q)

const real = {
  async getComplaints(f = {}) {
    const pageSize = f.pageSize || 10
    const page = f.page || 1
    let ids = null
    if (f.duplicatesOnly) {
      const rels = check(
        await supabase.from('complaint_relations').select('complaint_id,related_complaint_id').eq('review_status', 'PENDING'),
      )
      ids = [...new Set(rels.flatMap((r) => [r.complaint_id, r.related_complaint_id]))]
      if (!ids.length) return { rows: [], total: 0 }
    }
    let q = supabase.from('complaints').select('*', { count: 'exact' })
    if (f.search?.trim()) {
      const s = f.search.trim().replace(/[,()%]/g, ' ')
      q = q.or(`title.ilike.%${s}%,complaint_number.ilike.%${s}%,address.ilike.%${s}%`)
    }
    if (f.category) q = q.eq('category', f.category)
    if (f.severity) q = q.eq('severity', f.severity)
    if (f.status) q = q.eq('status', f.status)
    if (f.department) q = q.eq('department', f.department)
    if (ids) q = q.in('id', ids)
    q = withDemo(q, f.demo)
    const col = { priority: 'priority_score', status: 'status', date: 'created_at' }[f.sort || 'date']
    q = q.order(col, { ascending: f.dir === 'asc' }).range((page - 1) * pageSize, page * pageSize - 1)
    const { data, error, count } = await q
    if (error) throw new ApiError(error.message)
    return { rows: data || [], total: count || 0 }
  },
  async getAllComplaints(f = {}) {
    return check(await withDemo(supabase.from('complaints').select(SLIM_COLS), f.demo).range(0, 4999))
  },
  async getComplaint(id) {
    // Assumes users.id <- complaints.user_id foreign key so the embed works.
    return check(await supabase.from('complaints').select('*, users(name,email)').eq('id', id).single())
  },
  async getComplaintUpdates(id) {
    return check(
      await supabase.from('complaint_updates').select('*').eq('complaint_id', id).order('created_at', { ascending: true }),
    )
  },
  async getDuplicates(id) {
    const me = check(
      await supabase.from('complaints').select('id,latitude,longitude,incident_group_id').eq('id', id).single(),
    )
    const [nearby, rels] = await Promise.all([
      callFunction('nearby-duplicates', { method: 'GET', query: { complaintId: id } }).catch((e) => {
        if (e.status === 404) return []
        throw e
      }),
      supabase
        .from('complaint_relations')
        .select('*')
        .or(`complaint_id.eq.${id},related_complaint_id.eq.${id}`)
        .then(check),
    ])
    const otherIds = rels.map((r) => (r.complaint_id === id ? r.related_complaint_id : r.complaint_id))
    const others = otherIds.length ? check(await supabase.from('complaints').select('*').in('id', otherIds)) : []
    const byId = new Map(others.map((c) => [c.id, c]))
    const out = []
    const seen = new Set()
    rels.forEach((r) => {
      const other = byId.get(r.complaint_id === id ? r.related_complaint_id : r.complaint_id)
      if (!other) return
      seen.add(other.id)
      out.push({
        relationId: r.id, complaint: other, similarity_score: r.similarity_score, review_status: r.review_status,
        distance_m: haversineMeters(me.latitude, me.longitude, other.latitude, other.longitude),
      })
    })
    ;(nearby || []).forEach((n) => {
      if (!n.complaint || n.complaint.id === id || seen.has(n.complaint.id)) return
      out.push({
        relationId: null, complaint: n.complaint, similarity_score: n.similarity_score, review_status: 'PENDING',
        distance_m: haversineMeters(me.latitude, me.longitude, n.complaint.latitude, n.complaint.longitude),
      })
    })
    return out.sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
  },
  async updateComplaint(id, patch) {
    let newStatus = patch.status
    if (!newStatus) {
      newStatus = check(await supabase.from('complaints').select('status').eq('id', id).single()).status
    }
    return callFunction('update-status', {
      body: {
        complaintId: id,
        newStatus,
        remarks: patch.remarks,
        department: patch.department,
        severity: patch.severity,
        category: patch.category,
      },
    })
  },
  async resolveDuplicate(relationId, action, ctx = {}) {
    // If Claude 1's API.md provides a dedicated function, call it here instead.
    let relId = relationId
    if (!relId) {
      if (!ctx.complaintId || !ctx.relatedId) throw new ApiError('Missing duplicate context')
      const row = check(
        await supabase
          .from('complaint_relations')
          .insert({
            complaint_id: ctx.complaintId, related_complaint_id: ctx.relatedId,
            similarity_score: ctx.similarity ?? null, review_status: 'PENDING',
          })
          .select()
          .single(),
      )
      relId = row.id
    }
    const review_status = action === 'MERGE' ? 'MERGED' : action === 'SEPARATE' ? 'SEPARATE' : 'PENDING'
    check(await supabase.from('complaint_relations').update({ review_status }).eq('id', relId).select().single())
    let incident_group_id = null
    if (action === 'MERGE') {
      incident_group_id = ctx.incidentGroupId || ctx.complaintId
      check(
        await supabase
          .from('complaints')
          .update({ incident_group_id })
          .in('id', [ctx.complaintId, ctx.relatedId])
          .select('id'),
      )
      if (ctx.markDuplicate) {
        await real.updateComplaint(ctx.relatedId, {
          status: 'DUPLICATE',
          remarks: `Merged into ${ctx.complaintNumber || ctx.complaintId}`,
        })
      }
    }
    return { review_status, incident_group_id }
  },
  async getStats(f = {}) {
    const complaints = check(await withDemo(supabase.from('complaints').select(SLIM_COLS), f.demo).range(0, 4999))
    const ids = new Set(complaints.map((c) => c.id))
    const [updates, relations] = await Promise.all([
      supabase.from('complaint_updates').select('id,complaint_id,previous_status,new_status,remarks,created_at').order('created_at', { ascending: false }).range(0, 9999).then(check),
      supabase.from('complaint_relations').select('id,complaint_id,review_status').range(0, 4999).then(check),
    ])
    return computeStats(
      complaints,
      updates.filter((u) => ids.has(u.complaint_id)),
      relations.filter((r) => ids.has(r.complaint_id)),
    )
  },
  async getDailySummary() {
    return callFunction('daily-summary', { method: 'GET' })
  },
}

// ---------- public API ----------
const impl = real

/** filters: { search, category, severity, status, department, duplicatesOnly, demo: 'all'|'real'|'demo', sort: 'date'|'priority'|'status', dir: 'asc'|'desc', page, pageSize } -> { rows, total } */
export const getComplaints = (filters) => impl.getComplaints(filters)
/** All complaints (slim columns) for the map. filters: { demo } */
export const getAllComplaints = (filters) => impl.getAllComplaints(filters)
export const getComplaint = (id) => impl.getComplaint(id)
export const getComplaintUpdates = (id) => impl.getComplaintUpdates(id)
/** -> [{ relationId|null, complaint, similarity_score, review_status, distance_m }] */
export const getDuplicates = (id) => impl.getDuplicates(id)
/** patch: { status?, remarks?, department?, severity?, category? }. Goes through update-status. */
export const updateComplaint = (id, patch) => impl.updateComplaint(id, patch)
/** action: 'MERGE' | 'SEPARATE' | 'PENDING'. ctx: { complaintId, relatedId, similarity, incidentGroupId, complaintNumber, markDuplicate } */
export const resolveDuplicate = (relationId, action, ctx) => impl.resolveDuplicate(relationId, action, ctx)
/** filters: { demo }. Everything is computed from stored records. */
export const getStats = (filters) => impl.getStats(filters)
/** Optional. Throws if the function is unavailable; callers should hide the card. */
export const getDailySummary = () => impl.getDailySummary()
