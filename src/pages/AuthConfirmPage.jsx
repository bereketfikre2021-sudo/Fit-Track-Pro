/**
 * AuthConfirmPage.jsx
 *
 * Route: /auth/confirm
 *
 * Handles the email confirmation redirect from Supabase.
 * Supabase sends users here with a token in the URL fragment.
 * The Supabase client (detectSessionInUrl: true) automatically
 * exchanges it for a session — we just need to redirect.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { supabase } from '../lib/supabase'

function AuthConfirmPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')  // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Supabase fires onAuthStateChange with SIGNED_IN or EMAIL_CONFIRMED
    // when it detects a valid token in the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2000)
      }
    })

    // Fallback: check if we already have a session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setStatus('error')
        setErrorMsg(error.message)
      } else if (session) {
        setStatus('success')
        setTimeout(() => navigate('/', { replace: true }), 2000)
      }
    })

    // If no event fires in 8 seconds, show error
    const timeout = setTimeout(() => {
      setStatus((prev) => prev === 'loading' ? 'error' : prev)
      setErrorMsg('Verification link expired or already used.')
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-sm w-full p-6 text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-bold text-lg">Email verified!</h1>
            <p className="text-sm text-muted-foreground">Taking you to the app…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="font-bold text-lg">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{errorMsg || 'The link is invalid or expired.'}</p>
            <Button className="w-full" onClick={() => navigate('/login', { replace: true })}>
              Back to sign in
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default AuthConfirmPage
