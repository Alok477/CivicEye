// Input (text input or textarea)
// Props: label (string), error (string), hint (string), as ('input'|'textarea', default 'input'),
//        className (applies to the field), ...rest (type, value, onChange, placeholder, required, rows ...)
import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input({ label, error, hint, as: Tag = 'input', className = '', id, ...rest }, ref) {
  const auto = useId()
  const fieldId = id || auto
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined
  return (
    <div className="w-full">
      {label && <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold">{label}</label>}
      <Tag
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-navy-300 focus:border-brand focus:ring-4 focus:ring-brand/10 ${Tag === 'input' ? 'h-11' : ''} ${error ? 'border-critical focus:border-critical focus:ring-critical/10' : 'border-line'} ${className}`}
        {...rest}
      />
      {error ? <p id={`${fieldId}-err`} className="mt-1.5 text-sm text-critical">{error}</p>
        : hint ? <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-navy-500">{hint}</p> : null}
    </div>
  )
})
export default Input
