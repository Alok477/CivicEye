// Shared contract values. Strings must match the backend exactly.

export const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE']

// Happy-path lifecycle used by timelines (REJECTED / DUPLICATE are terminal side exits)
export const STATUS_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']

export const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
}

// Plain-language explanations for citizens
export const STATUS_DESCRIPTIONS = {
  SUBMITTED: 'We have received your report. It is waiting for an administrator to look at it.',
  UNDER_REVIEW: 'An administrator is checking the details, the location and how urgent the issue is.',
  ASSIGNED: 'The issue has been passed to the department responsible for fixing it.',
  IN_PROGRESS: 'Work on this issue has started.',
  RESOLVED: 'The issue has been marked as fixed. Thank you for reporting it.',
  REJECTED: 'This report could not be accepted. Check the administrator remarks for the reason.',
  DUPLICATE: 'This issue was already reported by someone else, so it has been merged with the original report.',
}

export const STATUS_COLORS = {
  SUBMITTED: '#64748B',
  UNDER_REVIEW: '#18785E',
  ASSIGNED: '#7C3AED',
  IN_PROGRESS: '#EA580C',
  RESOLVED: '#16A34A',
  REJECTED: '#DC2626',
  DUPLICATE: '#64748B',
}

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']

export const SEVERITY_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#CA8A04',
  Low: '#16A34A',
}

// 80-100 Critical, 60-79 High, 30-59 Medium, 0-29 Low (thresholds configurable here)
export const SEVERITY_THRESHOLDS = { Critical: 80, High: 60, Medium: 30 }

export function SEVERITY_FROM_SCORE(score) {
  const s = Number(score)
  if (Number.isNaN(s)) return 'Low'
  if (s >= SEVERITY_THRESHOLDS.Critical) return 'Critical'
  if (s >= SEVERITY_THRESHOLDS.High) return 'High'
  if (s >= SEVERITY_THRESHOLDS.Medium) return 'Medium'
  return 'Low'
}

export const CATEGORIES = [
  'Road Damage',
  'Garbage & Sanitation',
  'Street Lighting',
  'Water Supply & Leakage',
  'Drainage & Sewage',
  'Public Safety',
  'Public Infrastructure',
  'Other',
]

export const DEPARTMENTS = [
  'Road Maintenance',
  'Sanitation',
  'Electrical & Lighting',
  'Water Works',
  'Drainage & Sewerage',
  'Public Safety',
  'General Administration',
]

export const COLORS = {
  navy: '#18382F',
  blue: '#18785E',
  background: '#F5F6F0',
  surface: '#FFFEFA',
  critical: '#C43D3D',
  high: '#D46A31',
  medium: '#B47B16',
  low: '#2E8058',
}

export const DISCLAIMER =
  'CivicEye is a demonstration platform. Complaints are not officially registered with any government authority.'

export const TAGLINE = 'Report Smarter. Resolve Faster. Build Better Communities.'

// Used only to frame the map before the user shares a location. Never submitted as a complaint location.
export const DEFAULT_MAP_CENTER = { lat: 28.6139, lng: 77.209 }
