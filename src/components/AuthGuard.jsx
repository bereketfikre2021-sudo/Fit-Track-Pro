import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

// On localhost dev, skip auth entirely so you can work without signing in.
const IS_LOCALHOST = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

/**
 * Wraps routes that require a Supabase session.
 * Shows nothing while the session check is loading to avoid a flash.
 * On localhost the guard is bypassed automatically.
 */
function AuthGuard({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Dev bypass — localhost skips the auth wall entirely
  if (IS_LOCALHOST) return children

  if (loading) {
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
