// src/components/admin/KpiCard.jsx
import { cardCls } from './adminUi'
import { Skeleton } from './StateBlocks'

export default function KpiCard({ label, value, hint, icon: Icon, tone = 'default', loading }) {
  const isText = typeof value === 'string'
  const accent = tone === 'danger' ? 'bg-red-50 text-critical' : 'bg-brand-soft text-brand'
  return (
    <div className={`${cardCls} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-600">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className={`mt-2 font-semibold text-navy ${isText ? 'text-base leading-8' : 'text-3xl'}`}>{value}</p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
