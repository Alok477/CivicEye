// Button
// Props: variant ('primary'|'secondary'|'ghost'|'danger', default 'primary'),
//        size ('sm'|'md'|'lg', default 'md'), loading (bool, shows spinner + disables),
//        icon (Lucide component, rendered before children), as (element/component, e.g. Link; default 'button'),
//        fullWidth (bool), className, ...rest (onClick, type, disabled, to, href ...)
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-brand text-white shadow-card hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lift',
  secondary: 'border border-line bg-surface text-navy hover:-translate-y-0.5 hover:border-brand/25 hover:bg-canvas',
  ghost: 'bg-transparent text-navy hover:bg-brand-soft hover:text-brand',
  danger: 'bg-critical text-white hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-card',
}
const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, as: Tag = 'button', fullWidth, className = '', children, disabled, type, ...rest },
  ref
) {
  const isButton = Tag === 'button'
  return (
    <Tag
      ref={ref}
      type={isButton ? type || 'button' : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 ease-out active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </Tag>
  )
})
export default Button
