import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Dumbbell, Plus, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import GymFloatingPattern from '../components/GymFloatingPattern'
import TodayWorkoutCard from '../components/TodayWorkoutCard'
import WaterTracker from '../components/WaterTracker'
import AiRecommendButton from '../components/AiRecommendButton'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
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
import { getDayMacroTotals } from '@/lib/mealPlan'

function HomePage({ state, updateState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const today = todayDateString()
  const [aiLoading, setAiLoading] = useState(false)
  const showExerciseSetupPrompt = shouldShowExerciseSetupPrompt(state)

  // Today's day name for meal plan lookup (mealPlan is keyed by weekday name)
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayMacros = getDayMacroTotals(state.mealPlan, todayDayName)

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
        {/* App motto */}
        <div className="mb-7 pl-4 border-l-4 border-primary">
          <p className="text-2xl font-display font-extrabold tracking-tight leading-tight text-foreground">
            Train with <span className="text-primary">purpose.</span>
          </p>
          <p className="text-2xl font-display font-extrabold tracking-tight leading-tight text-foreground">
            Track your <span className="text-primary">progress.</span>
          </p>
        </div>

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

        {/* Today's macro summary — HIDDEN for now, code kept for future use */}
        {false && todayMacros.itemCount > 0 && (
          <Card className="mb-6 border-border/60 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Today's nutrition</p>
                <Link to="/meal-plan" className="ml-auto text-xs text-primary hover:underline">
                  Edit
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Calories', value: todayMacros.calories > 0 ? `${Math.round(todayMacros.calories)}` : '—', unit: 'kcal' },
                  { label: 'Protein', value: todayMacros.protein > 0 ? `${Math.round(todayMacros.protein)}` : '—', unit: 'g' },
                  { label: 'Carbs', value: todayMacros.carbs > 0 ? `${Math.round(todayMacros.carbs)}` : '—', unit: 'g' },
                  { label: 'Fat', value: todayMacros.fat > 0 ? `${Math.round(todayMacros.fat)}` : '—', unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-lg bg-muted/40 py-2 px-1">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm font-bold leading-none">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{unit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
