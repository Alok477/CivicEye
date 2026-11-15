// useAuth() -> { user, profile, role, loading, signIn, signUp, signOut }
//   user: Supabase auth user (or null); profile: row from `users` table (or null)
//   role: 'citizen' | 'admin' (from profile, defaults to 'citizen' when signed in); null when signed out
//   signIn(email, password) / signUp(name, email, password) resolve to Supabase's { data, error }
//   loading: true until the session AND profile have been resolved
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

async function fetchProfile(userId) {
  // The backend trigger copies the new auth user into `users`; retry briefly in case it lags behind sign-up.
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (data) return data
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [profileFor, setProfileFor] = useState(null) // user id whose profile fetch has finished (even if no row was found)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) { setProfile(null); setProfileFor(null) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchProfile(userId).then((p) => {
      if (cancelled) return
      setProfile(p)
      setProfileFor(userId)
    })
    return () => { cancelled = true }
  }, [userId])

  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), [])
  const signUp = useCallback(
    (name, email, password) => supabase.auth.signUp({ email, password, options: { data: { name } } }),
    []
  )
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const user = session?.user ?? null
  // Loading until the session is known AND, for a signed-in user, until their profile fetch has finished.
  // This stops Login from redirecting an admin to /dashboard before the role is known.
  const loading = !authReady || (Boolean(userId) && profileFor !== userId)
  const role = user ? profile?.role ?? 'citizen' : null

  const value = useMemo(
    () => ({ user, profile: profileFor === userId ? profile : null, role, loading, signIn, signUp, signOut }),
    [user, profile, profileFor, userId, role, loading, signIn, signUp, signOut]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
