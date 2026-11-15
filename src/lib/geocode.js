// Reverse geocoding via OpenStreetMap Nominatim. Callers must debounce (max 1 request per pin move).
export async function reverseGeocode(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Address lookup failed')
  const data = await res.json()
  return data.display_name ?? ''
}
