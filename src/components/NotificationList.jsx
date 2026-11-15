// NotificationList. Props: items (notifications), onRead(id), loading (bool), compact (bool), onNavigate (fn, optional)
// Clicking an item marks it read and opens its complaint (if it has one).
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { timeAgo } from '../lib/format'
import EmptyState from './ui/EmptyState'

export default function NotificationList({ items, onRead, loading, compact = false, onNavigate }) {
  if (loading) {
    return <div className="space-y-3 p-4" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 w-full" />)}</div>
  }
  if (!items.length) {
    return <EmptyState icon={Bell} title="No notifications yet" description="Updates about your complaints will show up here." className={compact ? 'py-8' : ''} />
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const body = (
          <div className="flex gap-3 px-4 py-3 text-left">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-brand'}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${n.is_read ? '' : 'font-semibold'}`}>{n.title}</p>
              {n.message && <p className="mt-0.5 line-clamp-2 text-sm text-navy-500">{n.message}</p>}
              <p className="mt-1 text-xs text-navy-300">{timeAgo(n.created_at)}{n.is_read ? '' : ' · Unread'}</p>
            </div>
          </div>
        )
        const handle = () => { if (!n.is_read) onRead?.(n.id); onNavigate?.() }
        return (
          <li key={n.id}>
            {n.complaint_id ? (
              <Link to={`/complaints/${n.complaint_id}`} onClick={handle} className="block hover:bg-slate-50">{body}</Link>
            ) : (
              <button onClick={handle} className="block w-full hover:bg-slate-50">{body}</button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
