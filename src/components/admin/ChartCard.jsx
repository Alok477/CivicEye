// src/components/admin/ChartCard.jsx
import { cardCls } from './adminUi'
import { Skeleton } from './StateBlocks'

export default function ChartCard({ title, subtitle, loading, children, className = '' }) {
  return (
    <section className={`${cardCls} p-4 sm:p-5 ${className}`}>
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3">{loading ? <Skeleton className="h-60 w-full" /> : children}</div>
    </section>
  )
}
