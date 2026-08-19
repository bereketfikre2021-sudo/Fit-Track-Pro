import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'
import { useOnlineStatus } from '../lib/useOnlineStatus'

// On localhost dev, skip auth entirely so you can work without signing in.
const IS_LOCALHOST = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

/**
 * Check if there's a cached Supabase session in localStorage.
 * Used to allow offline access for previously-authenticated users.
 */
function hasCachedSession() {
  try {
    const keys = Object.keys(localStorage)
    const sbKey = keys.find((k) => k.includes('supabase') && k.includes('auth-token'))
    if (!sbKey) return false
    const raw = localStorage.getItem(sbKey)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const s = parsed?.currentSession ?? parsed
    return !!(s?.access_token)
  } catch {
    return false
  }
}

/**
 * Wraps routes that require a Supabase session.
 * - While loading: shows spinner (max 4 seconds due to timeout in useAuth)
 * - Offline + previously logged in: lets user through with cached session
 * - Online + no session: redirects to /login
 */
function AuthGuard({ children }) {
  const { session, loading } = useAuth()
  const { isOnline } = useOnlineStatus()
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

  // If we have a live session, always allow through
  if (session) return children

  // Offline with a cached session — allow through so the app works offline
  if (!isOnline && hasCachedSession()) return children

  // No session and online (or offline with no cached session) — go to login
  return <Navigate to="/login" state={{ from: location }} replace />
}

export default AuthGuard
