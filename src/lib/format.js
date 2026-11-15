const opts = { day: 'numeric', month: 'short', year: 'numeric' }
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', opts) : '')
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { ...opts, hour: 'numeric', minute: '2-digit' }) : ''

export function timeAgo(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`
  return fmtDate(d)
}
