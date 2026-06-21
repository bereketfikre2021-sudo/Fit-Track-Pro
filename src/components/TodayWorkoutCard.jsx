import { useState } from 'react'
import { Calendar, CheckCircle, Dumbbell, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { getTodayWorkoutContext } from '@/lib/calendarDay'
import { completionKey, getTodaySessionForDay } from '@/lib/workoutSession'
import { EXERCISE_PHASE, inferExercisePhase } from '@/lib/exercisePhase'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getSkipReasonLabel } from '@/lib/exerciseSkip'
import SkipDayDialog from './SkipDayDialog'

function TodayWorkoutCard({
  workoutDays,
  workoutSchedule,
  completedExercises,
  completedSessions,
  today,
  activeSession,
  onStartSession,
  onSkipToday,
  className,
}) {
  const { t } = useTranslation()
  const [skipOpen, setSkipOpen] = useState(false)
  const ctx = getTodayWorkoutContext(workoutDays)
  const focusDay = ctx.planDay || ctx.nextWorkoutDay

  if (!focusDay || !workoutDays?.length) return null

  const schedule = workoutSchedule[focusDay] || { exercises: [] }
  const allExercises = schedule.exercises || []
  const mainExercises = allExercises.filter(
    (ex) => inferExercisePhase(ex) === EXERCISE_PHASE.MAIN
  )
  const total = mainExercises.length
  const completed = mainExercises.reduce((acc, ex) => {
    const entry = completedExercises?.[completionKey(today, focusDay, ex.id)]
    return acc + (entry?.completedAt && !entry?.skipped ? 1 : 0)
  }, 0)
  const sessionActive = activeSession?.day === focusDay
  const isToday = !!ctx.planDay
  const todaySession =
    isToday && focusDay ? getTodaySessionForDay(completedSessions, focusDay, today) : null
  const sessionDoneToday = !!todaySession
  const focusDayLabel = translateWeekday(focusDay)

  return (
    <Card
      className={cn(
        'mb-6 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              {isToday ? t('todayCard.today') : t('todayCard.next')}
            </p>
            <h2 className="text-lg font-bold leading-tight">{focusDayLabel}</h2>
            {!isToday && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('todayCard.restDay', { day: translateWeekday(ctx.calendarToday) })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                <Dumbbell className="h-3 w-3 mr-1" />
                {t('common.exercises', { count: total })}
              </Badge>
              {sessionDoneToday && todaySession?.skipped && (
                <Badge variant="outline" className="text-xs">
                  {t('todayCard.skippedToday', {
                    reason: getSkipReasonLabel(todaySession.skipReason),
                  })}
                </Badge>
              )}
              {sessionDoneToday && !todaySession?.skipped && (
                <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('common.completed')}
                </Badge>
              )}
              {total > 0 && isToday && (
                <span className="text-xs text-muted-foreground">
                  {t('todayCard.doneToday', { completed, total })}
                </span>
              )}
            </div>
          </div>
        </div>
        {schedule.note && (
          <p className="text-xs text-muted-foreground mt-3 border-t border-border/60 pt-3 line-clamp-2">
            {schedule.note}
          </p>
        )}
        {total > 0 && !sessionActive && isToday && (
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={sessionDoneToday}
              onClick={() => onStartSession(focusDay)}
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              {sessionDoneToday ? t('todayCard.doneForToday') : t('common.start')}
            </Button>
            {!sessionDoneToday && onSkipToday && (
              <Button size="sm" variant="outline" onClick={() => setSkipOpen(true)}>
                {t('todayCard.skipToday')}
              </Button>
            )}
          </div>
        )}
        {total > 0 && !isToday && (
          <p className="text-xs text-muted-foreground mt-3 border-t border-border/60 pt-3">
            {t('todayCard.startOnDay', { day: focusDayLabel })}
          </p>
        )}
      </CardContent>

      {onSkipToday && (
        <SkipDayDialog
          open={skipOpen}
          onOpenChange={setSkipOpen}
          dayLabel={focusDayLabel}
          onConfirm={(reason) => onSkipToday(focusDay, reason)}
        />
      )}
    </Card>
  )
}

export default TodayWorkoutCard
