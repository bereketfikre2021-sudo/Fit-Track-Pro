import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Plus, Flame, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import GymFloatingPattern from '../components/GymFloatingPattern'
import TodayWorkoutCard from '../components/TodayWorkoutCard'
import WaterTracker from '../components/WaterTracker'
import AiRecommendButton from '../components/AiRecommendButton'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import { canStartWorkoutForDay } from '@/lib/calendarDay'
import { fetchExerciseRecommendation } from '@/lib/aiRecommendations'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { showImportWarnings } from '@/lib/importWarnings'
import { shouldShowExerciseSetupPrompt } from '@/lib/planEmpty'
import {
  getTodaySessionForDay,
  skipWorkoutForToday,
  startWorkoutSession,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getAiToastKey } from '@/lib/aiErrors'
import { getWorkoutStreaks } from '@/lib/streaks'

function HomePage({ state, updateState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const today = todayDateString()
  const [aiLoading, setAiLoading] = useState(false)
  const showExerciseSetupPrompt = shouldShowExerciseSetupPrompt(state)
  const streaks = getWorkoutStreaks(state.completedExercises || {})

  const handleStartSession = (day) => {
    const workoutDays = state.profile?.workoutDays || []
    if (!canStartWorkoutForDay(day, workoutDays)) {
      toast.error(t('home.toastStartOnDay', { day: translateWeekday(day) }))
      return
    }
    const activeSession = state.activeWorkoutSession || null
    if (getTodaySessionForDay(state.completedSessions, day, today)) {
      toast.error(t('home.toastAlreadyDone'))
      return
    }
    if (activeSession?.date === today) {
      toast.error(t('home.toastFinishSession', { day: translateWeekday(activeSession.day) }))
      return
    }
    updateState({ activeWorkoutSession: startWorkoutSession(day, today) })
    toast.success(t('home.toastStarted', { day: translateWeekday(day) }))
    navigate('/workout')
  }

  const handleSkipToday = (day, reason) => {
    const today = todayDateString()
    if (getTodaySessionForDay(state.completedSessions, day, today)) {
      toast.error(t('home.toastAlreadyDone'))
      return
    }
    updateState(skipWorkoutForToday(state, day, reason, today))
    toast.success(t('home.toastSkippedToday'))
  }

  const handleAiExerciseRecommend = async () => {
    setAiLoading(true)
    try {
      const parsed = await fetchExerciseRecommendation(state)
      const result = applyExerciseImport(state, parsed, IMPORT_MODE.APPEND)
      updateState({
        customExercises: result.customExercises,
        workoutSchedule: result.workoutSchedule,
        profile: result.profile,
      })
      const { exercisesAdded, scheduleEntriesAdded, warnings } = result.summary
      const parts = []
      if (exercisesAdded) parts.push(t('common.exercises', { count: exercisesAdded }))
      if (scheduleEntriesAdded) {
        parts.push(
          t('custom.importScheduleEntries', {
            count: scheduleEntriesAdded,
            defaultValue: `${scheduleEntriesAdded} schedule assignment(s)`,
          })
        )
      }
      toast.success(
        parts.length
          ? t('custom.toastAiAdded', {
              parts: parts.join(` ${t('common.and', { defaultValue: 'and' })} `),
              defaultValue: `AI added ${parts.join(' and ')}`,
            })
          : t('custom.toastAiApplied')
      )
      showImportWarnings(warnings, { title: t('custom.aiNotesTitle') })
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="relative p-4 md:p-6 pb-20 md:pb-6 min-h-[calc(100vh-12rem)] pt-10 md:pt-12">
      <GymFloatingPattern />
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{t('home.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Streak banner */}
        {streaks.current > 0 && (
          <div className={cn(
            'mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
            streaks.current >= 7
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'border-primary/30 bg-primary/5'
          )}>
            <div className="flex items-center gap-3">
              <Flame className={cn(
                'h-6 w-6 shrink-0',
                streaks.current >= 7 ? 'text-amber-500' : 'text-primary'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-bold',
                  streaks.current >= 7 ? 'text-amber-500' : 'text-primary'
                )}>
                  {t('streak.dayStreak', { count: streaks.current })}
                </p>
                <p className="text-xs text-muted-foreground">{t('streak.consecutive')}</p>
              </div>
            </div>
            {streaks.longest > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {t('streak.best', { count: streaks.longest })}
                </span>
              </div>
            )}
          </div>
        )}

        <TodayWorkoutCard
          workoutDays={state.profile?.workoutDays || []}
          workoutSchedule={state.workoutSchedule || {}}
          completedExercises={state.completedExercises || {}}
          completedSessions={state.completedSessions || []}
          today={today}
          activeSession={state.activeWorkoutSession || null}
          onStartSession={handleStartSession}
          onSkipToday={handleSkipToday}
        />

        <WaterTracker state={state} updateState={updateState} today={today} />

        {showExerciseSetupPrompt && (
          <Card className="border-border/80 bg-card/90 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-10 px-4">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2 text-center">
                {t('home.emptyTitle')}
              </p>
              <p className="text-sm text-muted-foreground mb-5 text-center max-w-sm">
                {t('home.emptyDesc')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center w-full max-w-md">
                <AiRecommendButton
                  loading={aiLoading}
                  label={t('ai.exerciseLabel')}
                  onClick={handleAiExerciseRecommend}
                  size="default"
                  className="w-full sm:w-auto"
                />
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/exercises">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('workout.addExercises')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default HomePage
