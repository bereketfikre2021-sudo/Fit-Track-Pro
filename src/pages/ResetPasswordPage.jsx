/**
 * ResetPasswordPage.jsx
 *
 * Route: /auth/reset-password
 *
 * Supabase sends a reset email containing a link like:
 *   https://yourapp.com/auth/reset-password#access_token=...&type=recovery
 *
 * When the user clicks that link, Supabase's `detectSessionInUrl: true` option
 * (set in supabase.js) automatically parses the hash and fires an
 * onAuthStateChange event with event = 'PASSWORD_RECOVERY', establishing a
 * temporary session. We listen for that event here to know when it's safe to
 * call updateUser({ password }).
 *
 * Supabase Dashboard requirement:
 *   Auth → URL Configuration → Redirect URLs → add:
 *     https://yourapp.com/auth/reset-password
 *   (and http://localhost:5173/auth/reset-password for local dev)
 */

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import PageBackground from '../components/PageBackground'
import GymFloatingPattern from '../components/GymFloatingPattern'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [tokenReady, setTokenReady] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const passwordsMatch = password === confirm
  const isValid = password.length >= 8 && passwordsMatch

  // ── Wait for Supabase to exchange the recovery token from the URL hash ──
  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects the #access_token hash.
    // detectSessionInUrl: true (set in supabase.js) handles this automatically.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setTokenReady(true)
      }
    })

    // If no recovery event fires within 5 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setTokenError((prev) => (prev ? prev : !tokenReady))
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || !tokenReady) return

    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Could not update password. The link may have expired.')
      return
    }

    setDone(true)
    toast.success('Password updated!')

    // Give the user a moment to read the confirmation, then go home
    setTimeout(() => navigate('/', { replace: true }), 2500)
  }

  return (
    <div className="min-h-dvh flex flex-col relative">
      <PageBackground
        src="/Background 5.webp"
        imageClassName="opacity-45"
        overlayClassName="bg-background/65"
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'hsla(84, 81%, 44%, 0.18)' }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center">

          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/icon-192.png"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl mx-auto mb-4"
            />
            <h1 className="text-4xl font-display font-extrabold tracking-tight">FitTrack Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">Set a new password</p>
          </div>

          <Card className="w-full p-5 bg-card border-border/50 shadow-lg">

            {/* ── Success ── */}
            {done && (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-sm">Password updated!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taking you to the app…
                  </p>
                </div>
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden />
              </div>
            )}

            {/* ── Invalid / expired link ── */}
            {!done && tokenError && (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-sm">Link invalid or expired</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Password reset links expire after 1 hour. Request a new one.
                  </p>
                </div>
                <Button asChild className="w-full h-9 text-sm">
                  <Link to="/forgot-password">Request new link</Link>
                </Button>
                <Button asChild variant="outline" className="w-full h-9 text-sm">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            )}

            {/* ── Loading — waiting for token ── */}
            {!done && !tokenError && !tokenReady && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden />
                <p className="text-xs text-muted-foreground">Verifying reset link…</p>
              </div>
            )}

            {/* ── Set new password form ── */}
            {!done && !tokenError && tokenReady && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reset-password" className="text-xs font-medium">
                    New password{' '}
                    <span className="text-muted-foreground font-normal">(min. 8 characters)</span>
                  </label>
                  <div className="relative mt-0.5">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8 h-9 text-sm"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-confirm" className="text-xs font-medium">
                    Confirm new password
                  </label>
                  <div className="relative mt-0.5">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                      required
                    />
                  </div>
                  {confirm && !passwordsMatch && (
                    <p className="text-[11px] text-destructive mt-1">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-9 text-sm"
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </Button>
              </form>
            )}

          </Card>
        </div>
      </div>

      <div
        className="relative shrink-0 h-[28vh] min-h-[160px] max-h-[260px] w-full pointer-events-none z-0"
        aria-hidden
      >
        <GymFloatingPattern />
      </div>
    </div>
  )
}

export default ResetPasswordPage
