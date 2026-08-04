import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

/**
 * Wraps routes that require a Supabase session.
 * Shows nothing while the session check is loading to avoid a flash.
 */
function AuthGuard({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    // Minimal full-screen spinner — avoids layout flash
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default AuthGuard
