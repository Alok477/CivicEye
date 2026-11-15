// Select
// Props: label (string), error (string), options (array of strings or {value, label}),
//        placeholder (string, adds a disabled first option), value, onChange, className, ...rest
import { forwardRef, useId } from 'react'

const Select = forwardRef(function Select({ label, error, options = [], placeholder, className = '', id, ...rest }, ref) {
  const auto = useId()
  const fieldId = id || auto
  return (
    <div className="w-full">
      {label && <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold">{label}</label>}
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={`block h-11 w-full rounded-xl border bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-4 focus:ring-brand/10 ${error ? 'border-critical focus:border-critical focus:ring-critical/10' : 'border-line'} ${className}`}
        {...rest}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
      {error && <p className="mt-1.5 text-sm text-critical">{error}</p>}
    </div>
  )
})
export default Select
