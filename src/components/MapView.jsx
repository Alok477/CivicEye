// MapView: reusable Leaflet map (OpenStreetMap tiles).
// Props:
//   markers: [{ id, lat, lng, severity, title, status, category, popup? }]  coloured by severity
//   center: { lat, lng } or [lat, lng]   map centre (default: DEFAULT_MAP_CENTER). Changing it re-centres the map.
//   zoom: number                    default 13
//   onMarkerClick: (marker) => void
//   selectable: bool                pin-drop mode: clicking the map or dragging the pin calls onSelect({ lat, lng })
//   selected: { lat, lng } | null   current pin position in selectable mode
//   onSelect: ({ lat, lng }) => void
//   userLocation: { lat, lng } | null  shows a "you are here" dot
//   className: sizing, e.g. "h-72 w-full" (the map needs an explicit height)
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_MAP_CENTER, SEVERITY_COLORS, STATUS_LABELS } from '../lib/constants'

const pinIcon = L.divIcon({
  className: 'civic-pin',
  html: '<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 42 16 42s16-15 16-26.3C32 7 24.8 0 16 0z" fill="#18785E"/><circle cx="16" cy="15.5" r="6" fill="#fff"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
})

// Accepts { lat, lng } or [lat, lng] (the admin pages pass arrays). Returns null if not usable.
function toLatLng(c) {
  if (!c) return null
  if (Array.isArray(c)) return Number.isFinite(c[0]) && Number.isFinite(c[1]) ? { lat: c[0], lng: c[1] } : null
  return Number.isFinite(c.lat) && Number.isFinite(c.lng) ? c : null
}

function Recenter({ center, zoom }) {
  const map = useMap()
  // Never zoom out on re-centre, but do zoom in to the requested zoom (fixes the Report page staying at city level).
  useEffect(() => { map.setView([center.lat, center.lng], Math.max(map.getZoom(), zoom ?? 0)) }, [center.lat, center.lng]) // eslint-disable-line
  return null
}

function ClickToSelect({ onSelect }) {
  useMapEvents({ click: (e) => onSelect?.({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

export default function MapView({
  markers = [], center, zoom = 13, onMarkerClick, selectable = false, selected = null, onSelect, userLocation = null, className = 'h-96 w-full',
}) {
  const c = toLatLng(center) ?? toLatLng(selected) ?? toLatLng(userLocation) ?? DEFAULT_MAP_CENTER
  const pinHandlers = useMemo(() => ({
    dragend: (e) => { const p = e.target.getLatLng(); onSelect?.({ lat: p.lat, lng: p.lng }) },
  }), [onSelect])

  return (
    <div className={`overflow-hidden rounded-xl border border-line ${className}`}>
      <MapContainer center={[c.lat, c.lng]} zoom={zoom} zoomControl={false} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />
        <Recenter center={c} zoom={zoom} />
        {selectable && <ClickToSelect onSelect={onSelect} />}

        {markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)).map((m) => {
          const color = SEVERITY_COLORS[m.severity] ?? '#64748B'
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={9}
              pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95 }}
              eventHandlers={{ click: () => onMarkerClick?.(m) }}
            >
              <Popup>
                {m.popup ?? (
                  <div className="text-sm">
                    <strong className="block">{m.title}</strong>
                    {m.category && <span className="block">{m.category}</span>}
                    {m.severity && <span className="block" style={{ color }}>{m.severity}</span>}
                    {m.status && <span className="block">{STATUS_LABELS[m.status] ?? m.status}</span>}
                  </div>
                )}
              </Popup>
            </CircleMarker>
          )
        })}

        {userLocation && (
          <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#18785E', fillOpacity: 1 }} />
        )}
        {selectable && selected && <Marker position={[selected.lat, selected.lng]} icon={pinIcon} draggable eventHandlers={pinHandlers} />}
      </MapContainer>
    </div>
  )
}
