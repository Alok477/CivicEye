import iconLogo from '../../assets/civiceye-logo-icon.png'
import wordmarkLogo from '../../assets/civiceye-logo-with-text.png'

export default function BrandLogo({ markOnly = false, className = '', alt = 'CivicEye' }) {
  return (
    <img
      src={markOnly ? iconLogo : wordmarkLogo}
      alt={alt}
      className={`block h-8 w-auto object-contain ${className}`}
    />
  )
}
