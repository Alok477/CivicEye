// <RequireAuth>            redirects signed-out visitors to /login (remembers where they were going)
// <RequireRole role="admin"> sends signed-in users without that role to /dashboard
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './ui/Spinner'

function FullPageSpinner() {
  return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RequireRole({ role, children }) {
  const { user, role: userRole, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (userRole !== role) return <Navigate to="/dashboard" replace />
  return children
}
