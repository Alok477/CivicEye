import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/AuthLayout'
import { Button, Input } from '../../components/ui'

export function friendlyAuthError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'That email and password do not match. Check them and try again.'
  if (m.includes('email not confirmed')) return 'Confirm your email first. Open the link we sent you, then log in.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try logging in instead.'
  if (m.includes('password should be')) return 'Choose a password with at least 8 characters.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

export default function Login() {
  const { user, role, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Redirect once the session and profile (role) are known: admins -> /admin, citizens -> /dashboard
  useEffect(() => {
    if (user && !loading) navigate(from || (role === 'admin' ? '/admin' : '/dashboard'), { replace: true })
  }, [user, role, loading, from, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await signIn(email.trim(), password)
    if (err) { setError(friendlyAuthError(err.message)); setBusy(false) }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to report issues and track your complaints.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="rounded-lg bg-critical/5 p-3 text-sm text-critical">{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={busy || (Boolean(user) && loading)} disabled={!email || !password}>Log in</Button>
      </form>
      <p className="mt-6 text-sm text-navy-500">New to CivicEye? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></p>
    </AuthLayout>
  )
}
