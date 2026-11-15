// src/components/admin/charts.jsx
// Recharts wrappers. They only draw what getStats() returns; no numbers are invented here.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { STATUS_LABELS } from './adminUi'
import { NoData } from './StateBlocks'

export const SEV_COLORS = { Critical: '#DC2626', High: '#EA580C', Medium: '#CA8A04', Low: '#16A34A' }
const STATUS_COLORS = {
  SUBMITTED: '#64748B',
  UNDER_REVIEW: '#18785E',
  ASSIGNED: '#7C3AED',
  IN_PROGRESS: '#0EA5E9',
  RESOLVED: '#16A34A',
  REJECTED: '#94A3B8',
  DUPLICATE: '#CBD5E1',
}
const BRAND = '#18785E'
const tick = { fontSize: 12, fill: '#64748B' }
const statusLabel = (s) => STATUS_LABELS?.[s] || s.replace(/_/g, ' ')
const trunc = (s) => (String(s).length > 24 ? `${String(s).slice(0, 23)}...` : s)

function Frame({ label, height, children }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function HBar({ data, nameKey = 'name', dataKey = 'value', colorOf, label, fill = BRAND }) {
  const rows = (data || []).filter((d) => d[dataKey] > 0)
  if (!rows.length) return <NoData />
  return (
    <Frame label={label} height={Math.max(200, rows.length * 36 + 30)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" allowDecimals={false} tick={tick} />
        <YAxis type="category" dataKey={nameKey} width={150} tick={tick} tickFormatter={trunc} />
        <Tooltip cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey={dataKey} name="Complaints" radius={[0, 4, 4, 0]} fill={fill}>
          {colorOf && rows.map((r) => <Cell key={r[nameKey]} fill={colorOf(r)} />)}
        </Bar>
      </BarChart>
    </Frame>
  )
}

export function CategoryChart({ data }) {
  return <HBar data={data} label="Complaints by category" />
}

export function StatusChart({ data }) {
  const rows = (data || []).map((d) => ({ ...d, label: statusLabel(d.name) }))
  return <HBar data={rows} nameKey="label" colorOf={(r) => STATUS_COLORS[r.name] || BRAND} label="Complaints by status" />
}

export function TopAreasChart({ data }) {
  return <HBar data={data} nameKey="label" dataKey="count" label="Areas with the most complaints" />
}

export function SeverityChart({ data }) {
  const rows = (data || []).filter((d) => d.value > 0)
  if (!rows.length) return <NoData />
  return (
    <Frame label="Complaints by severity" height={260}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {rows.map((r) => (
            <Cell key={r.name} fill={SEV_COLORS[r.name] || BRAND} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" iconType="circle" />
      </PieChart>
    </Frame>
  )
}

export function TimeChart({ data }) {
  if (!data || data.every((d) => !d.count)) return <NoData text="No complaints were submitted in the last 30 days." />
  return (
    <Frame label="Complaints submitted per day over the last 30 days" height={260}>
      <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E2E8F0" />
        <XAxis dataKey="label" tick={tick} interval={4} />
        <YAxis allowDecimals={false} tick={tick} width={32} />
        <Tooltip />
        <Area type="monotone" dataKey="count" name="Complaints" stroke={BRAND} fill="#DDECE2" strokeWidth={2} />
      </AreaChart>
    </Frame>
  )
}

export function DepartmentChart({ data }) {
  const rows = (data || []).filter((d) => d.total > 0)
  if (!rows.length) return <NoData />
  return (
    <Frame label="Open and resolved complaints per department" height={Math.max(220, rows.length * 44 + 50)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#E2E8F0" />
        <XAxis type="number" allowDecimals={false} tick={tick} />
        <YAxis type="category" dataKey="name" width={150} tick={tick} tickFormatter={trunc} />
        <Tooltip cursor={{ fill: '#F1F5F9' }} />
        <Legend iconType="circle" />
        <Bar dataKey="open" name="Open" stackId="a" fill={BRAND} />
        <Bar dataKey="resolved" name="Resolved" stackId="a" fill="#16A34A" radius={[0, 4, 4, 0]} />
      </BarChart>
    </Frame>
  )
}
