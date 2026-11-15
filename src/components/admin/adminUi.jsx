// src/components/admin/adminUi.jsx
// ONE place where admin pages import Claude 2's shared pieces. If a path or export name differs,
// fix it here and nothing else changes.
// Assumed props: SeverityBadge { severity }, StatusBadge { status }, Modal { open, onClose, title, children }.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export { default as SeverityBadge } from '../ui/SeverityBadge'
export { default as StatusBadge } from '../ui/StatusBadge'
export { default as Modal } from '../ui/Modal'
export { STATUSES, STATUS_LABELS, SEVERITIES, CATEGORIES, DEPARTMENTS, COLORS } from '../../lib/constants'

// Shared look for plain form controls and buttons used across admin pages
export const fieldCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-navy outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-canvas disabled:text-navy-300'
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50'
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-navy hover:bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50'
export const cardCls = 'rounded-xl border border-line bg-surface shadow-card'

export const formatDate = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'

export const formatShortDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

export const formatHours = (h) => {
  if (h == null) return null
  if (h < 48) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} days`
}

// ---- Local toast (swap for Claude 2's Toast here if its API fits) ----
const NotifyCtx = createContext(null)

export function NotifyProvider({ children }) {
  const [items, setItems] = useState([])
  const dismiss = useCallback((id) => setItems((l) => l.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (kind, message) => {
      const id = `${Date.now()}-${Math.random()}`
      setItems((l) => [...l, { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )
  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )
  return (
    <NotifyCtx.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg ${
              t.kind === 'error' ? 'border-red-200' : 'border-brand/20'
            }`}
          >
            {t.kind === 'error' ? (
              <XCircle size={18} className="mt-0.5 shrink-0 text-[#DC2626]" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-low" aria-hidden="true" />
            )}
            <p className="flex-1 text-slate-800">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-slate-400 hover:text-navy outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </NotifyCtx.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotifyCtx)
  if (!ctx) throw new Error('useNotify must be used inside NotifyProvider')
  return ctx
}
