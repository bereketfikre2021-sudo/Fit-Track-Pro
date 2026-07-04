import { useEffect, useRef, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  formatCountdown,
  playRestCompleteFeedback,
} from '@/lib/restTimer'
import {
  getHoldReadyRemaining,
  getHoldRemaining,
} from '@/lib/holdTimer'
import { toast } from 'sonner'

function HoldTimer({ timer, onStop, onComplete, playSound = true, vibrate = true }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState('ready')
  const [displaySeconds, setDisplaySeconds] = useState(0)
  const holdEndsAtRef = useRef(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!timer) {
      setPhase('ready')
      setDisplaySeconds(0)
      holdEndsAtRef.current = null
      completedRef.current = false
      return undefined
    }

    holdEndsAtRef.current = null
    completedRef.current = false
    setPhase('ready')

    const tick = () => {
      if (completedRef.current) return

      if (!holdEndsAtRef.current) {
        const left = getHoldReadyRemaining(timer)
        setPhase('ready')
        setDisplaySeconds(left)
        if (left <= 0) {
          holdEndsAtRef.current = Date.now() + timer.holdSeconds * 1000
          setPhase('hold')
          setDisplaySeconds(getHoldRemaining(holdEndsAtRef.current))
        }
        return
      }

      const left = getHoldRemaining(holdEndsAtRef.current)
      setPhase('hold')
      setDisplaySeconds(left)
      if (left <= 0) {
        completedRef.current = true
        playRestCompleteFeedback({ sound: playSound, vibrate })
        toast.success(t('holdTimer.complete'))
        onStop()
        onComplete?.()
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [timer, onStop, playSound, vibrate, t])

  if (!timer || displaySeconds <= 0) return null

  const isReady = phase === 'ready'
  const totalSeconds = isReady ? timer.readyTotalSeconds : timer.holdSeconds
  const progress =
    totalSeconds > 0 ? ((totalSeconds - displaySeconds) / totalSeconds) * 100 : 0

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[60] px-4 pb-safe',
        'bottom-[4.5rem] md:bottom-4'
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-lg rounded-xl border shadow-lg p-4',
          isReady
            ? 'border-amber-500/40 bg-card shadow-amber-500/10'
            : 'border-primary/40 bg-card shadow-primary/10'
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className={cn('h-3.5 w-3.5', isReady ? 'text-amber-500' : 'text-primary')} />
              {isReady ? t('holdTimer.ready') : t('holdTimer.holding')}
              {timer.label && (
                <span className="truncate text-foreground">· {timer.label}</span>
              )}
            </p>
            <p
              className={cn(
                'text-3xl font-bold tabular-nums mt-1',
                isReady ? 'text-amber-500' : 'text-primary'
              )}
            >
              {formatCountdown(displaySeconds)}
            </p>
            {!isReady && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t('holdTimer.target', { sec: timer.holdSeconds })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onStop} aria-label={t('holdTimer.stopAria')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isReady ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default HoldTimer
