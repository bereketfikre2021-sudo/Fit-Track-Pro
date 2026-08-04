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

/** Shows a compact history bar for a specific day (e.g. "Monday").
 *  Renders pill-style session entries with date and status — works on mobile too. */
function DayHistoryBar({ completedSessions, day, today }) {
  // Two months back from today
  const twoMonthsAgo = new Date(today)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const cutoff = twoMonthsAgo.toISOString().slice(0, 10)

  const past = (completedSessions || [])
    .filter((s) => s.day === day && s.date !== today && s.endedAt && s.date >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date)) // oldest → newest

  if (past.length === 0) return null

  const doneCount = past.filter((s) => !s.skipped).length
  const skippedCount = past.filter((s) => s.skipped).length

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const [, month, dayNum] = dateStr.split('-')
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(dayNum)} ${monthNames[parseInt(month) - 1]}`
  }

  return (
    <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">
        Past {past.length} {translateWeekday(day)} sessions
      </p>
      <div className="flex flex-wrap gap-1">
        {past.map((s) => (
          <div
            key={s.id}
            className={cn(
              'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium',
              s.skipped
                ? 'bg-destructive/10 text-destructive/80'
                : 'bg-primary/10 text-primary'
            )}
          >
            {formatDate(s.date)}{s.skipped ? ' Skip' : ' Done'}
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground self-center">
          <span className="text-primary font-semibold">{doneCount} done</span>
          {skippedCount > 0 && <span className="text-destructive/80 font-semibold ml-1">{skippedCount} skipped</span>}
        </span>
      </div>
    </div>
  )
}

function TodayWorkoutCard({
  workoutDays,
  workoutSchedule,
  completedExercises,
  completedSessions,
  transferredWorkouts = {},
  today,
  activeSession,
  onStartSession,
  onSkipToday,
  onTransferToday,
  className,
}) {
  const { t } = useTranslation()
  const [skipOpen, setSkipOpen] = useState(false)
  const ctx = getTodayWorkoutContext(workoutDays)

  // Check if today has a transferred workout (one-time rest day override)
  const transfer = transferredWorkouts?.[today]
  const isTransferDay = !!(transfer && transfer.toDay === ctx.calendarToday)

  // If today is a transfer target, use the source day's exercises
  const focusDay = isTransferDay ? transfer.fromDay : (ctx.planDay || ctx.nextWorkoutDay)

  if (!focusDay || (!workoutDays?.length && !isTransferDay)) return null

  const schedule = workoutSchedule[focusDay] || { exercises: [] }
  const allExercises = schedule.exercises || []
  const warmupExercises = allExercises.filter(
    (ex) => inferExercisePhase(ex) === EXERCISE_PHASE.WARMUP
  )
  const mainExercises = allExercises.filter(
    (ex) => inferExercisePhase(ex) === EXERCISE_PHASE.MAIN
  )
  const cooldownExercises = allExercises.filter(
    (ex) => inferExercisePhase(ex) === EXERCISE_PHASE.COOLDOWN
  )
  const total = mainExercises.length
  const totalAll = allExercises.length
  const completed = mainExercises.reduce((acc, ex) => {
    const entry = completedExercises?.[completionKey(today, focusDay, ex.id)]
    return acc + (entry?.completedAt && !entry?.skipped ? 1 : 0)
  }, 0)

  // Phase breakdown string e.g. "Warmup 2 · Main 6 · Cooldown 1"
  const phaseParts = [
    warmupExercises.length   > 0 ? `Warmup ${warmupExercises.length}`   : null,
    mainExercises.length     > 0 ? `Main ${mainExercises.length}`       : null,
    cooldownExercises.length > 0 ? `Cooldown ${cooldownExercises.length}` : null,
  ].filter(Boolean).join(' · ')
  const sessionActive = activeSession?.day === focusDay
  const isToday = isTransferDay || !!ctx.planDay
  const todaySession =
    isToday && focusDay ? getTodaySessionForDay(completedSessions, focusDay, today) : null
  const sessionDoneToday = !!todaySession
  const focusDayLabel = translateWeekday(focusDay)

  return (
    <Card
      className={cn(
        'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card',
        className
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary flex items-center gap-1.5 mb-0.5">
              <Calendar className="h-3.5 w-3.5" />
              {isTransferDay
                ? `Transferred from ${translateWeekday(transfer.fromDay)}`
                : isToday ? t('todayCard.today') : t('todayCard.next')}
            </p>
            <h2 className="text-base font-bold leading-tight">{focusDayLabel}</h2>
            {!isToday && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('todayCard.restDay', { day: translateWeekday(ctx.calendarToday) })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="secondary" className="text-xs">
                <Dumbbell className="h-3 w-3 mr-1" />
                {t('common.exercises', { count: totalAll })}
                {phaseParts && (
                  <span className="ml-1.5 text-muted-foreground font-normal">({phaseParts})</span>
                )}
              </Badge>
              {sessionDoneToday && todaySession?.skipped && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-500/50 bg-amber-500/10 text-amber-400"
                >
                  {todaySession.skipReason === 'transfer'
                    ? `Transferred to ${translateWeekday(Object.values(transferredWorkouts || {}).find(t => t.fromDay === focusDay)?.toDay || '')}`
                    : todaySession.skipReason === 'injury'
                    ? 'Skipped — Injury / Pain'
                    : todaySession.skipReason === 'busy'
                    ? 'Skipped — Short on time'
                    : `Skipped — ${getSkipReasonLabel(todaySession.skipReason)}`}
                </Badge>
              )}
              {sessionDoneToday && !todaySession?.skipped && (
                <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('common.completed')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {schedule.note && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2 line-clamp-1">
            {schedule.note}
          </p>
        )}

        <DayHistoryBar
          completedSessions={completedSessions}
          day={focusDay}
          today={today}
        />

        {total > 0 && !sessionActive && isToday && (
          <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-2 items-center">
            {/* Hide Start if already skipped or completed */}
            {!sessionDoneToday && (
              <>
                <Button
                  size="sm"
                  onClick={() => onStartSession(focusDay)}
                >
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {t('common.start')}
                </Button>
                {onSkipToday && (
                  <Button size="sm" variant="outline" onClick={() => setSkipOpen(true)}>
                    {t('todayCard.skipToday')}
                  </Button>
                )}
              </>
            )}
            {sessionDoneToday && todaySession?.skipped && (
              <p className="text-xs text-muted-foreground">
                {todaySession.skipReason === 'injury'
                  ? 'Workout skipped due to injury. Rest and recover!'
                  : todaySession.skipReason === 'busy'
                  ? "No worries — catch it next time."
                  : todaySession.skipReason === 'transfer'
                  ? `Moved to ${translateWeekday(Object.values(transferredWorkouts || {}).find(t => t.fromDay === focusDay)?.toDay || 'another day')} — keep it up!`
                  : 'Workout skipped for today.'}
              </p>
            )}
            {sessionDoneToday && !todaySession?.skipped && (
              <p className="text-xs text-primary font-medium">
                Great work today!
              </p>
            )}
          </div>
        )}
        {total > 0 && !isToday && (
          <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2">
            {t('todayCard.startOnDay', { day: focusDayLabel })}
          </p>
        )}
      </CardContent>

      {onSkipToday && (
        <SkipDayDialog
          open={skipOpen}
          onOpenChange={setSkipOpen}
          dayLabel={focusDayLabel}
          todayName={ctx.calendarToday}
          workoutDays={workoutDays}
          onConfirm={(reason) => onSkipToday(focusDay, reason)}
          onTransfer={(targetDay) => onTransferToday?.(focusDay, targetDay)}
        />
      )}
    </Card>
  )
}

export default TodayWorkoutCard
