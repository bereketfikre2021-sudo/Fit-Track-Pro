import { useTranslation } from 'react-i18next'
import { Droplets, Plus, Minus } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { getAppSettings, updateAppSettings } from '@/lib/appSettings'

// 1 cup ≈ 250 ml ≈ 8.45 oz
const CUP_TO_ML = 250
const CUP_TO_OZ = 8.45

function formatAmount(cups, unit) {
  if (unit === 'ml') return `${Math.round(cups * CUP_TO_ML)} ml`
  if (unit === 'oz') return `${Math.round(cups * CUP_TO_OZ)} oz`
  return `${cups} cup${cups !== 1 ? 's' : ''}`
}

function formatGoal(goal, unit) {
  if (unit === 'ml') return `${goal * CUP_TO_ML} ml`
  if (unit === 'oz') return `${Math.round(goal * CUP_TO_OZ)} oz`
  return `${goal} cups`
}

/**
 * Daily water intake tracker widget.
 * Stores data in state.waterLogs: { 'YYYY-MM-DD': cups }
 */
function WaterTracker({ state, updateState, today }) {
  const { t } = useTranslation()
  const appSettings = getAppSettings(state)
  const goal = appSettings.waterGoalCups ?? 8
  const unit = appSettings.waterUnit ?? 'cups'

  const waterLogs = state.waterLogs || {}
  const cups = waterLogs[today] ?? 0
  const percent = Math.min(100, Math.round((cups / goal) * 100))
  const done = cups >= goal

  const setCups = (next) => {
    const clamped = Math.max(0, Math.min(next, goal + 5))
    updateState({ waterLogs: { ...waterLogs, [today]: clamped } })
  }

  const cycleUnit = () => {
    const next = unit === 'cups' ? 'ml' : unit === 'ml' ? 'oz' : 'cups'
    updateState(updateAppSettings(state, { waterUnit: next }))
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
                  : `Goal: ${formatGoal(goal, unit)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Unit toggle */}
            <button
              type="button"
              onClick={cycleUnit}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded px-1.5 py-0.5 transition-colors"
              title="Switch unit"
            >
              {unit.toUpperCase()}
            </button>

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

        {/* Progress bar */}
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
            {formatAmount(cups, unit)} / {formatGoal(goal, unit)} ({percent}%)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default WaterTracker
