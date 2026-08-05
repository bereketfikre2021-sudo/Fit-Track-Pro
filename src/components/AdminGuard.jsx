/**
 * AdminGuard.jsx
 *
 * Route wrapper that requires the user to have admin or super_admin role.
 * Redirects unauthorized users to home, never to login (they're already signed in).
 *
 * Usage:
 *   <AdminGuard>
 *     <AdminDashboard />
 *   </AdminGuard>
 *
 * For a specific role level:
 *   <AdminGuard requiredRole="super_admin">
 *     <DangerousAdminPage />
 *   </AdminGuard>
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

function AdminGuard({ children, requiredRole = 'admin' }) {
  const { session, loading, hasRole } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  // Not logged in → login page
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Logged in but insufficient role → home with no message (don't reveal admin routes exist)
  if (!hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminGuard
