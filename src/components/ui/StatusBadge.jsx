// StatusBadge
// Props: status (one of STATUSES, e.g. 'IN_PROGRESS'), className
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/constants'

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null
  const color = STATUS_COLORS[status] ?? '#64748B'
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ color, backgroundColor: `${color}14` }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
