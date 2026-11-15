// Spinner
// Props: size ('sm'|'md'|'lg', default 'md'), label (string, screen-reader text, default 'Loading'), className
import { Loader2 } from 'lucide-react'

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }

export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  return (
    <span role="status" className={`inline-flex items-center ${className}`}>
      <Loader2 className={`${SIZES[size]} animate-spin text-brand`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
