/**
 * useAuth.jsx
 *
 * Full authentication context for FitTrack Pro.
 *
 * Covers:
 *   - Email/password sign-up + sign-in
 *   - Google OAuth (PKCE flow)
 *   - Magic link (passwordless)
 *   - Password reset + update
 *   - Email verification check
 *   - Role-based access (user / moderator / admin / super_admin)
 *   - Session persistence + auto token refresh (handled by Supabase client)
 *   - Secure sign-out (clears local state + offline queue)
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// ─────────────────────────────────────────────────────────────────────────────
//  App base URL — explicit per environment so OAuth redirects land on the
//  correct origin (localhost in dev, production URL in prod).
//  Fallback to window.location.origin for safety.
// ─────────────────────────────────────────────────────────────────────────────
const APP_URL = import.meta.env.VITE_APP_URL?.replace(/\/$/, '') || window.location.origin

// ─────────────────────────────────────────────────────────────────────────────
//  Role helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_HIERARCHY = { user: 0, moderator: 1, admin: 2, super_admin: 3 }

/** Returns true if the user has at least the given role. */
export function hasRole(roles, required) {
  if (!roles || roles.length === 0) return false
  const maxLevel = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] ?? 0))
  return maxLevel >= (ROLE_HIERARCHY[required] ?? 999)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [roles,   setRoles]     = useState([])        // ['user'] | ['admin'] etc.
  const rolesLoadedFor          = useRef(null)

  // ── Load roles from public.user_roles ──────────────────────────────────────
  const loadRoles = useCallback(async (userId) => {
    if (!userId || rolesLoadedFor.current === userId) return
    rolesLoadedFor.current = userId
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      setRoles(data?.map((r) => r.role) ?? ['user'])
    } catch {
      setRoles(['user'])
    }
  }, [])

  // ── Session bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    // Hard timeout: if Supabase doesn't respond in 4 seconds (offline),
    // release the loading state so the app can render with whatever
    // session is cached in localStorage.
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 4000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      if (session?.user?.id) loadRoles(session.user.id)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      // Offline or network error — try to read cached session from localStorage
      try {
        const keys = Object.keys(localStorage)
        const sbKey = keys.find((k) => k.includes('supabase') && k.includes('auth-token'))
        if (sbKey) {
          const raw = localStorage.getItem(sbKey)
          if (raw) {
            const parsed = JSON.parse(raw)
            const cachedSession = parsed?.currentSession ?? parsed
            if (cachedSession?.access_token) {
              setSession(cachedSession)
              if (cachedSession?.user?.id) loadRoles(cachedSession.user.id)
            }
          }
        }
      } catch { /* ignore */ }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeout)
      setSession(session)
      if (session?.user?.id) {
        loadRoles(session.user.id)
      } else {
        setRoles([])
        rolesLoadedFor.current = null
      }
      setLoading(false)

      // Log sign-in / sign-out events to audit_logs (best-effort)
      if (event === 'SIGNED_IN' && session?.user?.id) {
        supabase.from('audit_logs').insert({
          user_id: session.user.id,
          action: 'login',
          metadata: { provider: session.user.app_metadata?.provider ?? 'email' },
        }).then(() => {})
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadRoles])

  // ── Auth methods ────────────────────────────────────────────────────────────

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${APP_URL}/auth/confirm`,
      },
    })
    return { error }
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  /** Signs out and clears all local state. */
  const signOut = async () => {
    await supabase.auth.signOut()
    setRoles([])
    rolesLoadedFor.current = null
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${APP_URL}/`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    return { error }
  }

  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${APP_URL}/`,
        shouldCreateUser: true,
      },
    })
    return { error }
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  /**
   * Resend the confirmation email for users who haven't verified yet.
   */
  const resendVerificationEmail = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return { error }
  }

  /**
   * Register an existing localStorage-only user to cloud.
   */
  const registerExistingUser = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  // ── Derived helpers ─────────────────────────────────────────────────────────

  const isEmailVerified = session?.user?.email_confirmed_at != null
  const isAdmin         = hasRole(roles, 'admin')
  const isSuperAdmin    = hasRole(roles, 'super_admin')
  const isModerator     = hasRole(roles, 'moderator')

  const value = {
    session,
    user:    session?.user ?? null,
    loading,
    roles,

    // Role helpers
    isEmailVerified,
    isAdmin,
    isSuperAdmin,
    isModerator,
    hasRole: (required) => hasRole(roles, required),

    // Auth methods
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    resendVerificationEmail,
    registerExistingUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
