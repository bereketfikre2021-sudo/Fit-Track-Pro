import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getWorkoutStreaks } from '@/lib/streaks'

function StreakDisplay({ state, className, compact = false }) {
  const { t } = useTranslation()
  const { current, longest } = getWorkoutStreaks(state.completedExercises)

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 text-sm', className)}>
        <span className="flex items-center gap-1.5 font-medium">
          <Flame className={cn('h-4 w-4', current > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
          {t('streak.dayStreak', { count: current })}
        </span>
        <span className="text-muted-foreground">{t('streak.best', { count: longest })}</span>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Flame className={cn('h-3.5 w-3.5', current > 0 ? 'text-orange-500' : '')} />
          {t('streak.current')}
        </p>
        <p className="text-2xl font-bold">{current}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t('streak.consecutive')}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-1">{t('streak.bestTitle')}</p>
        <p className="text-2xl font-bold">{longest}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{t('streak.personalRecord')}</p>
      </div>
    </div>
  )
}

export default StreakDisplay
