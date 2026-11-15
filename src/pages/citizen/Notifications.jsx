import { Card, Button } from '../../components/ui'
import NotificationList from '../../components/NotificationList'
import { useNotifications } from '../../lib/notifications'

export default function Notifications() {
  const { items, unread, loading, markRead, markAllRead } = useNotifications(100)
  return (
    <div className="page max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Notifications</h1>
          <p className="text-navy-500">{unread ? `${unread} unread` : 'You are all caught up.'}</p>
        </div>
        {unread > 0 && <Button variant="secondary" onClick={markAllRead}>Mark all as read</Button>}
      </div>
      <Card padded={false}><NotificationList items={items} loading={loading} onRead={markRead} /></Card>
    </div>
  )
}
