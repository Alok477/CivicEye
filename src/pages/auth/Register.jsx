import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/AuthLayout'
import { Button, Input } from '../../components/ui'
import { friendlyAuthError } from './Login'

export default function Register() {
  const { user, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    if (user && !loading) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (name.trim().length < 2) return setError('Enter your name.')
    if (password.length < 8) return setError('Choose a password with at least 8 characters.')
    setBusy(true)
    const { data, error: err } = await signUp(name.trim(), email.trim(), password)
    setBusy(false)
    if (err) return setError(friendlyAuthError(err.message))
    if (!data.session) setCheckEmail(true) // email confirmation is switched on in Supabase
  }

  if (checkEmail) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <div className="flex gap-3 rounded-xl border border-line bg-white p-5 text-sm">
          <MailCheck className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
          <p>Open the link in that email, then come back and <Link to="/login" className="font-semibold text-brand hover:underline">log in</Link>.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Report civic issues and follow them until they are resolved.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
        {error && <p role="alert" className="rounded-lg bg-critical/5 p-3 text-sm text-critical">{error}</p>}
        <Button type="submit" size="lg" fullWidth loading={busy || (Boolean(user) && loading)} disabled={!name || !email || !password}>Create account</Button>
      </form>
      <p className="mt-6 text-sm text-navy-500">Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Log in</Link></p>
    </AuthLayout>
  )
}
