// src/components/admin/StateBlocks.jsx
// Loading / error / empty building blocks shared by admin pages.
import { RefreshCw, Inbox } from 'lucide-react'
import { btnPrimary, cardCls } from './adminUi'

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

export function ErrorBlock({ error, onRetry, title = 'Could not load data' }) {
  return (
    <div role="alert" className={`${cardCls} flex flex-col items-center gap-3 p-10 text-center`}>
      <p className="font-medium text-[#DC2626]">{title}</p>
      <p className="max-w-md text-sm text-slate-600">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={btnPrimary}>
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}

export function NoData({ title = 'No data yet', text = 'Charts fill in as complaints are submitted.' }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center text-slate-500">
      <Inbox size={24} aria-hidden="true" className="text-slate-400" />
      <p className="mt-2 text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs">{text}</p>
    </div>
  )
}
