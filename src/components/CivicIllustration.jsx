export default function CivicIllustration() {
  return (
    <svg viewBox="0 0 560 390" className="h-full min-h-48 w-full" aria-hidden="true">
      <defs>
        <pattern id="street-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="#D7E4D7" strokeWidth="1" />
        </pattern>
        <filter id="pin-shadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#18382F" floodOpacity=".18" />
        </filter>
      </defs>

      <rect width="560" height="390" fill="#E9F1E9" />
      <rect width="560" height="390" fill="url(#street-grid)" />
      <g fill="#DCE9DD">
        <rect x="20" y="22" width="112" height="64" rx="14" />
        <rect x="166" y="18" width="104" height="76" rx="14" />
        <rect x="366" y="22" width="154" height="62" rx="14" />
        <rect x="28" y="176" width="90" height="86" rx="14" />
        <rect x="166" y="164" width="92" height="67" rx="14" />
        <rect x="390" y="166" width="128" height="92" rx="14" />
        <rect x="30" y="302" width="128" height="60" rx="14" />
        <rect x="386" y="302" width="138" height="62" rx="14" />
      </g>
      <g fill="#BCD5C1">
        <circle cx="144" cy="127" r="13" />
        <circle cx="302" cy="61" r="11" />
        <circle cx="345" cy="282" r="15" />
        <circle cx="273" cy="337" r="10" />
        <circle cx="488" cy="121" r="12" />
      </g>
      <g fill="none" stroke="#FFFEFA" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-20 126C78 112 112 154 202 137s138-48 208-27 116 22 180 8" strokeWidth="42" />
        <path d="M294-18c-2 89-27 106-12 188s46 99 32 238" strokeWidth="34" />
        <path d="M-18 280c84-10 136 0 196 31s101 44 156 35 108-28 247-3" strokeWidth="28" />
      </g>
      <g fill="none" stroke="#D2E0D3" strokeWidth="1.5">
        <path d="M-20 126C78 112 112 154 202 137s138-48 208-27 116 22 180 8" />
        <path d="M294-18c-2 89-27 106-12 188s46 99 32 238" />
        <path d="M-18 280c84-10 136 0 196 31s101 44 156 35 108-28 247-3" />
      </g>

      <path className="map-route" d="M76 316C137 290 160 235 220 222s95 24 118-31 60-72 105-75" />
      <circle cx="76" cy="316" r="5" fill="#18785E" />
      <circle cx="443" cy="116" r="5" fill="#18785E" />

      <g transform="translate(220 218)" filter="url(#pin-shadow)">
        <g className="map-pin-float">
          <circle className="map-pin-pulse" r="23" fill="#D46A31" />
          <path d="M0-19c-10.5 0-19 8.5-19 19C-19 14 0 34 0 34S19 14 19 0C19-10.5 10.5-19 0-19Z" fill="#D46A31" />
          <circle cy="-1" r="7" fill="#FFFEFA" />
        </g>
      </g>
      <g transform="translate(443 116)" filter="url(#pin-shadow)">
        <g className="map-pin-float map-pin-delay">
          <circle className="map-pin-pulse map-pin-pulse-green" r="18" fill="#18785E" />
          <path d="M0-15c-8.3 0-15 6.7-15 15C-15 11 0 27 0 27S15 11 15 0C15-8.3 8.3-15 0-15Z" fill="#18785E" />
          <circle cy="-1" r="5.5" fill="#FFFEFA" />
        </g>
      </g>

      <g className="map-note-float">
        <rect x="30" y="32" width="147" height="43" rx="12" fill="#FFFEFA" stroke="#DEE6DC" />
        <circle cx="50" cy="53.5" r="6" fill="#D46A31" />
        <text x="64" y="50" fill="#587267" fontSize="9" fontWeight="700" letterSpacing="1.1">NEW REPORT</text>
        <text x="64" y="64" fill="#18382F" fontSize="11" fontWeight="700">Road damage nearby</text>
      </g>
      <g>
        <rect x="356" y="292" width="165" height="47" rx="12" fill="#FFFEFA" stroke="#DEE6DC" />
        <circle cx="376" cy="315.5" r="10" fill="#E7F1EB" />
        <path d="m372 315 2.7 2.7 5.4-5.8" fill="none" stroke="#18785E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <text x="393" y="312" fill="#587267" fontSize="9" fontWeight="700" letterSpacing="1">STATUS UPDATE</text>
        <text x="393" y="326" fill="#18382F" fontSize="11" fontWeight="700">Repair in progress</text>
      </g>
    </svg>
  )
}
