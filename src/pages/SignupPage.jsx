import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import PageBackground from '../components/PageBackground'
import GymFloatingPattern from '../components/GymFloatingPattern'
import { useAuth } from '../lib/useAuth'

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

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function SignupPage() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle, signInWithMagicLink } = useAuth()

  // Magic link
  const [magicEmail,   setMagicEmail]   = useState('')
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent,    setMagicSent]    = useState(false)

  // Google
  const [googleLoading, setGoogleLoading] = useState(false)

  // Password (advanced)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [confirm,      setConfirm]      = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [pwLoading,    setPwLoading]    = useState(false)

  const passwordsMatch = password === confirm
  const isValid = email.trim() && password.length >= 6 && passwordsMatch

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setGoogleLoading(false)
      toast.error(error.message || 'Google sign-in failed. Try again.')
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    if (!magicEmail.trim()) return
    setMagicLoading(true)
    const { error } = await signInWithMagicLink(magicEmail.trim())
    setMagicLoading(false)
    if (error) {
      toast.error(error.message || 'Could not send magic link. Try again.')
      return
    }
    setMagicSent(true)
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setPwLoading(true)
    const { error } = await signUp(email.trim(), password)
    setPwLoading(false)
    if (error) {
      toast.error(error.message || 'Sign-up failed. Please try again.')
      return
    }
    toast.success('Account created! Check your email to confirm, then sign in.', { duration: 6000 })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh flex flex-col relative">
      <PageBackground
        src="/Background 5.webp"
        imageClassName="opacity-45"
        overlayClassName="bg-background/65"
      />
      {/* Brand-colour tint — navy overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'hsla(224, 71%, 20%, 0.18)' }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-md flex flex-col items-center">

          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/icon-192.png" alt="" width={64} height={64}
              className="h-16 w-16 rounded-2xl mx-auto mb-4" />
            <h1 className="text-4xl font-display font-extrabold tracking-tight">FitTrack Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your free account</p>
          </div>

          <Card className="w-full p-5 bg-card border-border/50 shadow-lg space-y-4">

            {/* ── Google (primary) ── */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-semibold gap-3 border-border/80 hover:bg-muted/40"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <GoogleIcon className="h-5 w-5" />}
              Continue with Google
            </Button>

            <Divider label="or" />

            {/* ── Magic link ── */}
            {!magicSent ? (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label htmlFor="signup-magic-email" className="text-xs font-medium">
                    Email — we&apos;ll send you a sign-in link
                  </label>
                  <div className="relative mt-0.5">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signup-magic-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      className="pl-8 h-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full h-9 text-sm"
                  disabled={magicLoading || !magicEmail.trim()}
                >
                  {magicLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                    : 'Send magic link'}
                </Button>
              </form>
            ) : (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-center space-y-1">
                <p className="font-semibold text-primary flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden />
                  Check your inbox
                </p>
                <p className="text-xs text-muted-foreground">
                  We sent a sign-in link to{' '}
                  <span className="font-medium text-foreground">{magicEmail}</span>.
                  Click it to get started — no password needed.
                </p>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline mt-1"
                  onClick={() => { setMagicSent(false); setMagicEmail('') }}
                >
                  Use a different email
                </button>
              </div>
            )}

            {/* ── Advanced: email + password ── */}
            <div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setShowAdvanced(v => !v)}
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAdvanced ? 'Hide' : 'Sign up with password instead'}
              </button>

              {showAdvanced && (
                <form onSubmit={handlePassword} className="space-y-3 mt-3 pt-3 border-t border-border/50">
                  <div>
                    <label htmlFor="su-email" className="text-xs font-medium">Email</label>
                    <div className="relative mt-0.5">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="su-email" type="email" autoComplete="email"
                        placeholder="you@example.com" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-8 h-9 text-sm" required />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="su-password" className="text-xs font-medium">
                      Password <span className="text-muted-foreground font-normal">(min. 6 characters)</span>
                    </label>
                    <div className="relative mt-0.5">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="su-password" type={showPw ? 'text' : 'password'}
                        autoComplete="new-password" placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-8 pr-9 h-9 text-sm" required />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPw ? 'Hide' : 'Show'}>
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="su-confirm" className="text-xs font-medium">Confirm password</label>
                    <div className="relative mt-0.5">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="su-confirm" type={showPw ? 'text' : 'password'}
                        autoComplete="new-password" placeholder="••••••••"
                        value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        className="pl-8 h-9 text-sm" required />
                    </div>
                    {confirm && !passwordsMatch && (
                      <p className="text-[11px] text-destructive mt-1">Passwords do not match.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full h-9 text-sm"
                    disabled={pwLoading || !isValid}>
                    {pwLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                      : 'Create account'}
                  </Button>
                </form>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              {' · '}
              <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
            </p>
          </Card>
        </div>
      </div>

      <div className="relative shrink-0 h-[28vh] min-h-[160px] max-h-[260px] w-full pointer-events-none z-0" aria-hidden>
        <GymFloatingPattern />
      </div>
    </div>
  )
}

export default SignupPage
