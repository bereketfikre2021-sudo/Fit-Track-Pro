import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

/**
 * Provides Supabase auth state to the whole app.
 * session  — current Supabase session (null = signed out)
 * user     — convenience shortcut to session.user
 * loading  — true while the initial session check is in flight
 * signUp   — (email, password) → { error }
 * signIn   — (email, password) → { error }
 * signOut  — () → void
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Keep session state in sync with Supabase events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  /**
   * Sign in with Google OAuth.
   * Opens the Google consent screen in the same tab.
   * Supabase redirects back to `redirectTo` after success.
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { error }
  }

  /**
   * Send a magic link (passwordless email sign-in).
   * The user clicks the link in their email and is signed in automatically.
   *
   * @param {string} email
   */
  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: true,
      },
    })
    return { error }
  }

  /**
   * Send a password-reset email.
   * Supabase emails a link that redirects to SITE_URL/auth/reset-password
   * (configure SITE_URL in Supabase Dashboard → Auth → URL Configuration).
   *
   * @param {string} email
   * @returns {{ error: AuthError | null }}
   */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // After clicking the email link, Supabase redirects here with the
      // access token in the URL hash so the user can set a new password.
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  /**
   * Set a new password. Call this after the user arrives from the reset email
   * and Supabase has automatically restored the session from the URL hash.
   *
   * @param {string} newPassword
   * @returns {{ error: AuthError | null }}
   */
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  /**
   * Register an email+password account for a user who was previously using
   * the app without an account (localStorage-only mode).
   * Creates the account and immediately signs in — no page reload, no data loss.
   * The caller should then push all local state to Supabase.
   *
   * @param {string} email
   * @param {string} password
   * @returns {{ error: AuthError | null }}
   */
  const registerExistingUser = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    registerExistingUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
