/**
 * CloudBackupSection.jsx
 *
 * Shown inside Settings for users who are using the app without an account
 * (localStorage-only mode — the old behaviour before sign-in was added).
 *
 * What it does:
 *   1. Detects whether the user is signed in or not.
 *   2. If NOT signed in: shows an email + password form so the user can
 *      create an account IN PLACE — no navigation, no sign-out, no data loss.
 *   3. After account creation: immediately syncs all local data (profile,
 *      workouts, meals, body logs, water logs) to Supabase.
 *   4. If already signed in: shows a green "Your data is backed up" status.
 */

import { useState } from 'react'
import { Cloud, CheckCircle2, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import {
  syncUserProfile,
  syncBodyLog,
  syncMealSlot,
  syncWaterLog,
  syncWorkoutSession,
} from '../lib/supabaseDb'

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']

/** Push all local app state to Supabase after account creation. */
async function syncAllLocalData(userId, state) {
  const results = { ok: 0, failed: 0 }

  const run = async (fn) => {
    try { await fn(); results.ok++ }
    catch { results.failed++ }
  }

  // Profile
  if (state.profile?.name) {
    await run(() => syncUserProfile(userId, state.profile))
  }

  // Body logs
  for (const log of state.bodyLogs || []) {
    await run(() => syncBodyLog(userId, log))
  }

  // Meal plan
  for (const day of DAYS) {
    for (const slot of SLOTS) {
      const foods = state.mealPlan?.[day]?.[slot]
      if (foods?.length) {
        await run(() => syncMealSlot(userId, day, slot, foods))
      }
    }
  }

  // Water logs
  for (const [date, cups] of Object.entries(state.waterLogs || {})) {
    await run(() => syncWaterLog(userId, date, cups))
  }

  // Completed sessions
  for (const session of state.completedSessions || []) {
    await run(() => syncWorkoutSession(userId, session, state.completedExercises || {}))
  }

  return results
}

export function CloudBackupSection({ state }) {
  const { user, registerExistingUser, signInWithGoogle } = useAuth()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [expanded,    setExpanded]    = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const passwordsMatch = password === confirm
  const isValid = email.trim() && password.length >= 6 && passwordsMatch

  // After Google sign-in the user gets redirected back — Supabase
  // will fire onAuthStateChange and the component re-renders as signed-in.
  // On return we detect a new userId and sync local data automatically
  // via the existing useSupabaseSync hook in App.jsx.
  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setGoogleLoading(false)
      toast.error(error.message || 'Google sign-in failed.')
    }
    // On success the page redirects — no need to reset loading
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    const { error } = await registerExistingUser(email.trim(), password)
    setLoading(false)

    if (error) {
      // "User already registered" — tell them to sign in instead
      if (error.message?.toLowerCase().includes('already')) {
        toast.error('An account with that email already exists. Sign in from the login page instead.')
      } else {
        toast.error(error.message || 'Could not create account. Try again.')
      }
      return
    }

    // Account created — now sync all local data
    setSyncing(true)
    toast.info('Account created! Syncing your data to the cloud…', { duration: 4000 })

    // Supabase fires onAuthStateChange which updates useAuth's user.
    // We need the user id — get it directly from the session.
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    if (userId) {
      const { ok, failed } = await syncAllLocalData(userId, state)
      setSyncing(false)
      if (failed === 0) {
        toast.success(`All your data is now backed up to the cloud! (${ok} items synced)`)
      } else {
        toast.warning(`Sync mostly complete — ${ok} items uploaded, ${failed} failed. They will retry automatically.`)
      }
    } else {
      setSyncing(false)
      toast.info('Account created. Check your email to confirm, then your data will sync on next login.')
    }
  }

  // ── Already signed in ─────────────────────────────────────────────────────
  if (user) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-medium text-primary">Cloud backup active</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signed in as <span className="font-medium">{user.email}</span>. Your data syncs automatically.
          </p>
        </div>
      </div>
    )
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Collapsed teaser */}
      {!expanded && (
        <div
          className="flex items-start gap-3 rounded-md border border-border bg-muted/20 px-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded(true)}
        >
          <Cloud className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Back up your data to the cloud</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add an email and password to sync across devices — your current data stays intact.
            </p>
          </div>
          <span className="text-xs text-primary font-medium shrink-0">Set up →</span>
        </div>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className="rounded-md border border-border bg-card p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" aria-hidden />
              Create a free account
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Your existing workouts, meals, and progress will be uploaded instantly.
              No data will be deleted or reset.
            </p>
          </div>

          {/* Google — primary option */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-sm font-semibold gap-3 border-border/80 hover:bg-muted/40"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <GoogleIcon className="h-5 w-5" />}
            Continue with Google
          </Button>

          {/* Toggle email/password form */}
          {!showEmailForm ? (
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
              onClick={() => setShowEmailForm(true)}
            >
              Or create account with email + password →
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 pt-1 border-t border-border/50">
              {/* Email */}
              <div>
                <label htmlFor="backup-email" className="text-xs font-medium">Email</label>
                <div className="relative mt-0.5">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="backup-email" type="email" autoComplete="email"
                    placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-8 h-9 text-sm" required />
                </div>
              </div>
              {/* Password */}
              <div>
                <label htmlFor="backup-password" className="text-xs font-medium">
                  Password <span className="text-muted-foreground font-normal">(min. 6 characters)</span>
                </label>
                <div className="relative mt-0.5">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="backup-password" type={showPw ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-8 pr-9 h-9 text-sm" required />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {/* Confirm */}
              <div>
                <label htmlFor="backup-confirm" className="text-xs font-medium">Confirm password</label>
                <div className="relative mt-0.5">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input id="backup-confirm" type={showPw ? 'text' : 'password'}
                    autoComplete="new-password" placeholder="••••••••"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="pl-8 h-9 text-sm" required />
                </div>
                {confirm && !passwordsMatch && (
                  <p className="text-[11px] text-destructive mt-1">Passwords do not match.</p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1 h-9 text-sm"
                  disabled={loading || syncing || !isValid}>
                  {(loading || syncing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {syncing ? 'Syncing…' : loading ? 'Creating…' : 'Create & sync'}
                </Button>
                <Button type="button" variant="ghost" className="h-9 text-sm"
                  onClick={() => setShowEmailForm(false)}>
                  Back
                </Button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline font-medium">Sign in</a>
            </p>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CloudBackupSection
