import { useEffect, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  REST_PRESETS,
  formatCountdown,
  getRemainingSeconds,
  playRestCompleteFeedback,
} from '@/lib/restTimer'
import { toast } from 'sonner'

function RestTimer({ timer, onStop, onExtend, playSound = true, vibrate = true }) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!timer) {
      setRemaining(0)
      return undefined
    }

    const tick = () => {
      const left = getRemainingSeconds(timer.endsAt)
      setRemaining(left)
      if (left <= 0) {
        playRestCompleteFeedback({ sound: playSound, vibrate })
        toast.success(t('workout.restComplete'))
        onStop()
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [timer, onStop, playSound, vibrate, t])

  if (!timer || remaining <= 0) return null

  const progress =
    timer.totalSeconds > 0
      ? ((timer.totalSeconds - remaining) / timer.totalSeconds) * 100
      : 0

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[60] px-4 pb-safe',
        'bottom-[4.5rem] md:bottom-4'
      )}
    >
      <div className="mx-auto max-w-lg rounded-xl border border-primary/40 bg-card shadow-lg shadow-primary/10 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3.5 w-3.5 text-primary" />
              {t('restTimer.label')}
              {timer.label && (
                <span className="truncate text-foreground">· {timer.label}</span>
              )}
            </p>
            <p className="text-3xl font-bold tabular-nums text-primary mt-1">
              {formatCountdown(remaining)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onStop} aria-label={t('restTimer.stopAria')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {REST_PRESETS.map((sec) => (
            <Button
              key={sec}
              type="button"
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => onExtend(sec)}
            >
              {t('restTimer.addSeconds', { sec })}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RestTimer
