import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { RequireAuth, RequireRole } from './components/RouteGuards'
import Spinner from './components/ui/Spinner'
import EmptyState from './components/ui/EmptyState'
import { Hammer } from 'lucide-react'

// Pages load by file name. A page that has not been added to the repo yet shows a "coming soon" stub,
// so this file never has to change when new pages arrive (including Claude 3's ./pages/admin/index.jsx).
const loaders = import.meta.glob('./pages/**/*.jsx')
function page(path) {
  const loader = loaders[`./pages/${path}.jsx`]
  return lazy(
    loader ?? (() => Promise.resolve({ default: () => <EmptyState icon={Hammer} title="Coming soon" description={`${path} has not been added yet.`} /> }))
  )
}

const Landing = page('Landing')
const Login = page('auth/Login')
const Register = page('auth/Register')
const Dashboard = page('citizen/Dashboard')
const ReportIssue = page('citizen/ReportIssue')
const MyComplaints = page('citizen/MyComplaints')
const ComplaintDetails = page('citizen/ComplaintDetails')
const ExploreMap = page('citizen/ExploreMap')
const Notifications = page('citizen/Notifications')
const AdminRoutes = page('admin/index') // Claude 3 default-exports a component containing <Routes> for /admin/*

export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AppShell />}>
          <Route path="/explore" element={<ExploreMap />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/report" element={<RequireAuth><ReportIssue /></RequireAuth>} />
          <Route path="/complaints" element={<RequireAuth><MyComplaints /></RequireAuth>} />
          <Route path="/complaints/:id" element={<RequireAuth><ComplaintDetails /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        </Route>

        <Route path="/admin/*" element={<RequireRole role="admin"><AdminRoutes /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
