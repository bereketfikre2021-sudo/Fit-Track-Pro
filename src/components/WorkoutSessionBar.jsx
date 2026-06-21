import { useEffect, useState } from 'react'
import { Square, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import {
  countDayCompletions,
  formatSessionDuration,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getSkipReasonLabel } from '@/lib/exerciseSkip'

function WorkoutSessionBar({
  day,
  activeSession,
  dayExerciseCount,
  completedExercises,
  todaySession,
  completedCount,
  onEnd,
}) {
  const { t } = useTranslation()
  const [elapsed, setElapsed] = useState(0)
  const today = todayDateString()
  const isActiveForDay = activeSession?.day === day && activeSession?.date === today
  const completedToday =
    typeof completedCount === 'number'
      ? completedCount
      : countDayCompletions(completedExercises, day, today)
  const dayLabel = translateWeekday(day)

  useEffect(() => {
    if (!isActiveForDay) {
      setElapsed(0)
      return undefined
    }

    const tick = () => setElapsed(Date.now() - activeSession.startedAt)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isActiveForDay, activeSession?.startedAt])

  if (dayExerciseCount === 0) return null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          {isActiveForDay ? (
            <>
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {t('sessionBar.inProgress')}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  {formatSessionDuration(elapsed)}
                </span>
                <span>
                  {t('sessionBar.progress', { done: completedToday, total: dayExerciseCount })}
                </span>
              </p>
            </>
          ) : activeSession ? (
            <p className="text-sm text-muted-foreground">
              {t('sessionBar.activeOnDay', {
                day: translateWeekday(activeSession.day),
                currentDay: dayLabel,
              })}
            </p>
          ) : todaySession?.skipped ? (
            <p className="text-sm text-muted-foreground">
              {t('sessionBar.skippedDetail', {
                reason: getSkipReasonLabel(todaySession.skipReason),
              })}
            </p>
          ) : todaySession ? (
            <p className="text-sm text-muted-foreground">
              {t('sessionBar.completedDetail', {
                completed: todaySession.completedCount,
                total: todaySession.totalCount,
                duration: formatSessionDuration(todaySession.endedAt - todaySession.startedAt),
              })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('sessionBar.startProgress', { day: dayLabel })}
            </p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {isActiveForDay ? (
            <Button size="sm" variant="outline" onClick={onEnd}>
              <Square className="h-4 w-4 mr-2" />
              {t('sessionBar.endWorkout')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default WorkoutSessionBar
