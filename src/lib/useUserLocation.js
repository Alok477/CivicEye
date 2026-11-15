// useUserLocation({ auto }) -> { location, status, request }
//   status: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'
//   auto: if true, fetches the location without a prompt ONLY when permission was already granted earlier.
import { useCallback, useEffect, useState } from 'react'

export function useUserLocation({ auto = false } = {}) {
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('idle')

  const request = useCallback(() => {
    if (!navigator.geolocation) return setStatus('unavailable')
    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setStatus('granted') },
      () => setStatus('denied'),
      { timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    if (!auto || !navigator.permissions?.query) return
    navigator.permissions.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') request() }).catch(() => {})
  }, [auto, request])

  return { location, status, request }
}
