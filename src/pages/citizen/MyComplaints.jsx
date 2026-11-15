import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { STATUSES, STATUS_LABELS } from '../../lib/constants'
import { fmtDate } from '../../lib/format'
import { Button, Card, EmptyState, Input, Select, SeverityBadge, StatusBadge, useToast } from '../../components/ui'

export default function MyComplaints() {
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const status = params.get('status') ?? ''

  useEffect(() => {
    supabase.from('complaints')
      .select('id, complaint_number, title, category, severity, status, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Could not load your complaints. Please refresh.')
        setItems(data ?? [])
        setLoading(false)
      })
  }, [user.id]) // eslint-disable-line

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((c) => (!status || c.status === status) && (!q || `${c.title} ${c.complaint_number} ${c.category}`.toLowerCase().includes(q)))
  }, [items, status, query])

  return (
    <div className="page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">My complaints</h1>
          <p className="text-navy-500">Every issue you have reported, and where it stands.</p>
        </div>
        <Button as={Link} to="/report" icon={Plus}>Report an issue</Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Input aria-label="Search complaints" placeholder="Search by title, number or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select
          aria-label="Filter by status" value={status}
          onChange={(e) => (e.target.value ? setParams({ status: e.target.value }) : setParams({}))}
          options={[{ value: '', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
        />
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="space-y-3 p-5" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={items.length ? 'No complaints match these filters' : 'You have not reported anything yet'}
            description={items.length ? 'Try a different status or search term.' : 'Spotted a pothole, broken light or overflowing bin? Report it in a minute.'}
            action={!items.length && <Button as={Link} to="/report">Report an issue</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand">{c.complaint_number}</p>
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-sm text-navy-500">{c.category} · {fmtDate(c.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={c.severity} />
                  <StatusBadge status={c.status} />
                </div>
                <Button as={Link} to={`/complaints/${c.id}`} variant="secondary" size="sm" aria-label={`View ${c.complaint_number}`}>View</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
