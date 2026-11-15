// src/pages/admin/Analytics.jsx
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import useStats from '../../components/admin/useStats'
import ChartCard from '../../components/admin/ChartCard'
import DemoToggle from '../../components/admin/DemoToggle'
import KpiCard from '../../components/admin/KpiCard'
import { ErrorBlock, NoData } from '../../components/admin/StateBlocks'
import {
  CategoryChart,
  SeverityChart,
  StatusChart,
  TimeChart,
  TopAreasChart,
  DepartmentChart,
} from '../../components/admin/charts'
import { btnSecondary, cardCls, formatHours } from '../../components/admin/adminUi'

export default function Analytics() {
  const [demo, setDemo] = useState('all')
  const { stats, loading, error, reload } = useStats(demo)
  const d = stats?.duplicates
  const total = stats?.totals.total || 0
  const reduction = d && total > 0 ? Math.round((d.reportsMergedAway / total) * 100) : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Analytics</h1>
          <p className="text-sm text-slate-500">All figures are calculated from stored complaint records.</p>
        </div>
        <div className="flex items-center gap-2">
          <DemoToggle value={demo} onChange={setDemo} />
          <button type="button" onClick={reload} className={btnSecondary} aria-label="Refresh analytics">
            <RefreshCw size={15} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorBlock error={error} onRetry={reload} title="Could not load analytics" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Complaints by category" loading={loading}><CategoryChart data={stats?.byCategory} /></ChartCard>
            <ChartCard title="Complaints by severity" loading={loading}><SeverityChart data={stats?.bySeverity} /></ChartCard>
            <ChartCard title="Complaints by status" loading={loading}><StatusChart data={stats?.byStatus} /></ChartCard>
            <ChartCard title="Complaints over time" subtitle="Submitted per day, last 30 days" loading={loading}><TimeChart data={stats?.overTime} /></ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Top areas by complaint count"
              subtitle="Grouped by coordinates rounded to about 1 km, labelled with the most common address"
              loading={loading}
            >
              <TopAreasChart data={stats?.topAreas} />
            </ChartCard>
            <ChartCard title="Department workload" subtitle="Open and resolved complaints per department" loading={loading}>
              <DepartmentChart data={stats?.departmentWorkload} />
            </ChartCard>
          </div>

          <section className={`${cardCls} p-4 sm:p-5`}>
            <h2 className="text-base font-semibold text-navy">Duplicate reduction</h2>
            <p className="text-xs text-slate-500">Reports merged into an existing incident instead of being handled separately.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <KpiCard label="Total reports" value={d ? total : undefined} loading={loading} />
              <KpiCard label="Linked to incidents" value={d?.linkedReports} loading={loading} />
              <KpiCard label="Incident groups" value={d?.incidentGroups} loading={loading} />
              <KpiCard label="Unique incidents" value={d?.uniqueIncidents} hint="Total reports minus merged-away reports" loading={loading} />
              <KpiCard label="Pending duplicate reviews" value={d?.pendingReviews} loading={loading} />
            </div>
            {!loading && (
              <p className="mt-3 text-sm text-slate-700">
                {d && d.reportsMergedAway > 0
                  ? `${d.reportsMergedAway} report${d.reportsMergedAway === 1 ? '' : 's'} merged away, which is ${reduction}% fewer incidents to handle.`
                  : 'No reports have been merged yet.'}
              </p>
            )}
          </section>

          <section className={`${cardCls} overflow-hidden`}>
            <div className="p-4 sm:px-5">
              <h2 className="text-base font-semibold text-navy">Department performance</h2>
              <p className="text-xs text-slate-500">Average time from submission to resolution. Shown once a department has at least 3 resolved complaints.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">Department performance</caption>
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    {['Department', 'Open', 'Resolved', 'Total', 'Avg time to resolve'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8"><div className="h-5 animate-pulse rounded bg-slate-200" /></td></tr>
                  ) : !stats?.departmentWorkload.length ? (
                    <tr><td colSpan={5}><NoData /></td></tr>
                  ) : (
                    stats.departmentWorkload.map((r) => (
                      <tr key={r.name} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                        <td className="px-4 py-3 text-slate-700">{r.open}</td>
                        <td className="px-4 py-3 text-slate-700">{r.resolved}</td>
                        <td className="px-4 py-3 text-slate-700">{r.total}</td>
                        <td className="px-4 py-3 text-slate-700">{formatHours(r.avgResolutionHours) || <span className="text-slate-400">Not enough data yet</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
