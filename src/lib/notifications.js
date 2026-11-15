// useNotifications(limit) -> { items, unread, loading, markRead(id), markAllRead() }
// Loads the signed-in user's notifications and listens for new ones in realtime (if Realtime is enabled on the table).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

export function useNotifications(limit = 20) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
      .then(({ data }) => { if (active) { setItems(data ?? []); setLoading(false) } })

    const channel = supabase
      .channel(`notif-${userId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new, ...prev].slice(0, limit)))
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [userId, limit])

  const markRead = useCallback(async (id) => {
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [])

  const markAllRead = useCallback(async () => {
    setItems((xs) => xs.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
  }, [userId])

  return { items, unread: items.filter((n) => !n.is_read).length, loading, markRead, markAllRead }
}
