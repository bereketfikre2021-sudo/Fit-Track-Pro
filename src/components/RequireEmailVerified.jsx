/**
 * RequireEmailVerified.jsx
 *
 * Renders children only if the user's email is confirmed.
 * Shows a verification prompt with resend option otherwise.
 *
 * Google/OAuth users are always verified — this only applies to
 * email/password accounts.
 */

import { useState } from 'react'
import { Mail, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { useAuth } from '../lib/useAuth'

// On localhost dev, skip email verification gate entirely.
const IS_LOCALHOST = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

function RequireEmailVerified({ children }) {
  const { user, isEmailVerified, signOut, resendVerificationEmail } = useAuth()
  const [sending, setSending] = useState(false)

  // Localhost bypass — always pass through in dev
  if (IS_LOCALHOST) return children

  // OAuth users (Google) are always verified — skip this gate
  const isOAuth = user?.app_metadata?.provider !== 'email'
  if (isEmailVerified || isOAuth) return children

  const handleResend = async () => {
    if (!user?.email) return
    setSending(true)
    const { error } = await resendVerificationEmail(user.email)
    setSending(false)
    if (error) {
      toast.error(error.message || 'Failed to resend. Try again in a minute.')
    } else {
      toast.success('Verification email sent — check your inbox.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-5 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
          <Mail className="h-7 w-7 text-primary" aria-hidden />
        </div>

        <div>
          <h1 className="text-xl font-bold">Verify your email</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{user?.email}</span>.
            Click it to activate your account.
          </p>
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleResend}
            disabled={sending}
          >
            {sending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
              : <><RefreshCw className="mr-2 h-4 w-4" />Resend verification email</>}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Check your spam folder if you don&apos;t see the email within a few minutes.
        </p>
      </Card>
    </div>
  )
}

export default RequireEmailVerified
