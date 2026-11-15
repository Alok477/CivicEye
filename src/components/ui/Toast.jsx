// Toast
// Wrap the app in <ToastProvider> (done in main.jsx). In any component:
//   const toast = useToast()
//   toast.success('Saved'); toast.error('Could not save'); toast.info('Heads up')
// Optional 2nd argument: duration in ms (default 4500).
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
const STYLES = {
  success: { Icon: CheckCircle2, cls: 'text-low' },
  error: { Icon: AlertCircle, cls: 'text-critical' },
  info: { Icon: Info, cls: 'text-brand' },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((type, message, duration = 4500) => {
    const id = crypto.randomUUID()
    setItems((xs) => [...xs, { id, type, message }])
    setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const api = useMemo(() => ({
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d),
    info: (m, d) => push('info', m, d),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {items.map(({ id, type, message }) => {
          const { Icon, cls } = STYLES[type]
          return (
            <div key={id} role={type === 'error' ? 'alert' : 'status'} className="enter-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-lift">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} aria-hidden="true" />
              <p className="flex-1 text-sm">{message}</p>
              <button onClick={() => dismiss(id)} aria-label="Dismiss notification" className="rounded-lg p-1 text-navy-500 transition-colors hover:bg-brand-soft hover:text-brand"><X className="h-4 w-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
