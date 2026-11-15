// SeverityBadge
// Props: severity ('Critical'|'High'|'Medium'|'Low'), aiSuggested (bool, appends "AI suggested"), className
import { SEVERITY_COLORS } from '../../lib/constants'

export default function SeverityBadge({ severity, aiSuggested = false, className = '' }) {
  if (!severity) return null
  const color = SEVERITY_COLORS[severity] ?? '#64748B'
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {severity}
      {aiSuggested && <span className="font-normal opacity-80">(AI suggested)</span>}
    </span>
  )
}
