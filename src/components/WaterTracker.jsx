import { useTranslation } from 'react-i18next'
import { Droplets, Plus, Minus } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { getAppSettings } from '@/lib/appSettings'

/**
 * Daily water intake tracker widget.
 * Stores data in state.waterLogs: { 'YYYY-MM-DD': cups }
 */
function WaterTracker({ state, updateState, today }) {
  const { t } = useTranslation()
  const appSettings = getAppSettings(state)
  const goal = appSettings.waterGoalCups ?? 8

  const waterLogs = state.waterLogs || {}
  const cups = waterLogs[today] ?? 0
  const percent = Math.min(100, Math.round((cups / goal) * 100))
  const done = cups >= goal

  const setCups = (next) => {
    const clamped = Math.max(0, Math.min(next, goal + 5))
    updateState({ waterLogs: { ...waterLogs, [today]: clamped } })
  }

  return (
    <Card className={cn(
      'mb-6 border transition-colors',
      done ? 'border-blue-500/40 bg-blue-500/5' : 'border-border'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Droplets className={cn(
              'h-5 w-5 shrink-0',
              done ? 'text-blue-500' : 'text-blue-400'
            )} />
            <div>
              <p className="text-sm font-semibold leading-tight">
                {t('water.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {done
                  ? t('water.goalReached')
                  : t('water.goalOf', { goal })}
              </p>
            </div>
          </div>

          {/* Counter */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setCups(cups - 1)}
              disabled={cups === 0}
              aria-label={t('water.removeCup')}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>

            <span className={cn(
              'text-xl font-bold w-8 text-center tabular-nums',
              done ? 'text-blue-500' : 'text-foreground'
            )}>
              {cups}
            </span>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setCups(cups + 1)}
              disabled={cups >= goal + 5}
              aria-label={t('water.addCup')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar with cup icons */}
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {Array.from({ length: goal }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-2 rounded-full transition-colors',
                  i < cups
                    ? done ? 'bg-blue-500' : 'bg-blue-400'
                    : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            {t('water.progress', { cups, goal, percent })}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default WaterTracker
