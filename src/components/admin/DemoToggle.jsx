// src/components/admin/DemoToggle.jsx
// Lets judges switch between real submissions and seeded demo rows.
export default function DemoToggle({ value, onChange }) {
  return (
    <div role="group" aria-label="Data source" className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
      {[
        ['all', 'All data'],
        ['real', 'Real only'],
        ['demo', 'Demo only'],
      ].map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${
            value === v ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
