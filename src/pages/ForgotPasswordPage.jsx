import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import PageBackground from '../components/PageBackground'
import GymFloatingPattern from '../components/GymFloatingPattern'
import { useAuth } from '../lib/useAuth'

function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    const { error } = await resetPassword(email.trim())
    setLoading(false)

    if (error) {
      toast.error(error.message || 'Could not send reset email. Try again.')
      return
    }

    setSent(true)
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
            <p className="text-sm text-muted-foreground mt-1">Reset your password</p>
          </div>

          <Card className="w-full p-5 bg-card border-border/50 shadow-lg">
            {sent ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-sm">Check your email</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    We sent a reset link to{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                    Click the link in the email to set a new password.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Didn&apos;t receive it? Check your spam folder or{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => setSent(false)}
                    >
                      try again
                    </button>
                    .
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full h-9 text-sm mt-1">
                  <Link to="/login">Back to sign in</Link>
                </Button>
              </div>
            ) : (
              /* ── Request form ── */
              <>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Enter the email you signed up with. We&apos;ll send you a link to reset your
                  password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="text-xs font-medium">
                      Email
                    </label>
                    <div className="relative mt-0.5">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-8 h-9 text-sm"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-9 text-sm"
                    disabled={loading || !email.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 hover:underline text-muted-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden />
                    Back to sign in
                  </Link>
                </p>
              </>
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

export default ForgotPasswordPage
