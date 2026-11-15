// src/components/admin/useStats.js
import { useCallback, useEffect, useRef, useState } from 'react'
import { getStats } from '../../lib/adminApi'

export default function useStats(demo) {
  const [state, setState] = useState({ stats: null, loading: true, error: null })
  const reqRef = useRef(0)
  const load = useCallback(async () => {
    const id = ++reqRef.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const stats = await getStats({ demo })
      if (id === reqRef.current) setState({ stats, loading: false, error: null })
    } catch (error) {
      if (id === reqRef.current) setState({ stats: null, loading: false, error })
    }
  }, [demo])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load }
}
