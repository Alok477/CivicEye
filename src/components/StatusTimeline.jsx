// StatusTimeline. Props: status (current status), updates ([{ new_status, remarks, created_at }]), createdAt (complaint created_at)
// Shows SUBMITTED > UNDER_REVIEW > ASSIGNED > IN_PROGRESS > RESOLVED; REJECTED / DUPLICATE replace the remaining steps.
import { Check } from 'lucide-react'
import { STATUS_FLOW, STATUS_LABELS, STATUS_COLORS } from '../lib/constants'
import { fmtDateTime } from '../lib/format'

export default function StatusTimeline({ status, updates = [], createdAt }) {
  const byStatus = {}
  updates.forEach((u) => { (byStatus[u.new_status] ||= []).push(u) })

  const terminal = status === 'REJECTED' || status === 'DUPLICATE'
  const steps = terminal ? [...STATUS_FLOW.filter((s) => s === 'SUBMITTED' || byStatus[s]), status] : STATUS_FLOW
  const currentIdx = Math.max(0, steps.indexOf(status))

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'
        const color = STATUS_COLORS[s]
        const entries = byStatus[s] ?? []
        const when = entries.at(-1)?.created_at ?? (s === 'SUBMITTED' ? createdAt : null)
        const remarks = entries.map((e) => e.remarks).filter(Boolean)
        return (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0" aria-current={state === 'current' ? 'step' : undefined}>
            {i < steps.length - 1 && (
              <span className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 ${state === 'done' ? 'bg-low' : 'bg-line'}`} aria-hidden="true" />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${state === 'upcoming' ? 'border-line bg-white' : ''}`}
              style={state === 'done' ? { background: '#16A34A', borderColor: '#16A34A' } : state === 'current' ? { background: color, borderColor: color } : undefined}
            >
              {state === 'done' ? <Check className="h-4 w-4 text-white" aria-hidden="true" /> : state === 'current' ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={`text-sm font-semibold ${state === 'upcoming' ? 'text-navy-300' : ''}`}>
                {STATUS_LABELS[s]}
                <span className="sr-only"> ({state === 'done' ? 'completed' : state === 'current' ? 'current step' : 'not reached yet'})</span>
              </p>
              {when && state !== 'upcoming' && <p className="text-xs text-navy-500">{fmtDateTime(when)}</p>}
              {remarks.map((r, k) => (
                <p key={k} className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm text-navy-700"><span className="font-semibold">Administrator remarks: </span>{r}</p>
              ))}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
