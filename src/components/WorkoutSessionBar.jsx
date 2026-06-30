import { useTranslation } from 'react-i18next'
import { Card, CardContent } from './ui/card'
import {
  countDayExerciseProgress,
  formatSessionDuration,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getSkipReasonLabel } from '@/lib/exerciseSkip'
import { cn } from '@/lib/utils'

function WorkoutSessionBar({
  day,
  activeSession,
  allExercises,
  completedExercises,
  todaySession,
  progress,
}) {
  const { t } = useTranslation()
  const today = todayDateString()
  const isActiveForDay = activeSession?.day === day && activeSession?.date === today
  const dayLabel = translateWeekday(day)

  const { done, total, percent } =
    progress ??
    countDayExerciseProgress(completedExercises, allExercises, day, today)

  if (total === 0) return null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          {isActiveForDay ? (
            <>
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {t('sessionBar.inProgress')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('sessionBar.progress', { done, total, percent })}
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

        {(isActiveForDay || todaySession) && (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isActiveForDay ? 'bg-primary' : 'bg-primary/70'
                )}
                style={{
                  width: `${
                    todaySession && !isActiveForDay
                      ? todaySession.totalCount > 0
                        ? Math.round(
                            (todaySession.completedCount / todaySession.totalCount) * 100
                          )
                        : 0
                      : percent
                  }%`,
                }}
              />
            </div>
            {isActiveForDay && (
              <p className="text-[10px] text-muted-foreground text-right tabular-nums">
                {percent}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WorkoutSessionBar
