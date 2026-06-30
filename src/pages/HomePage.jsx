import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GymFloatingPattern from '../components/GymFloatingPattern'
import TodayWorkoutCard from '../components/TodayWorkoutCard'
import WaterTracker from '../components/WaterTracker'
import { NewUserGetStartedCard } from '../components/AiRecommendButton'
import { canStartWorkoutForDay } from '@/lib/calendarDay'
import {
  getTodaySessionForDay,
  skipWorkoutForToday,
  startWorkoutSession,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { shouldShowExerciseSetupPrompt } from '@/lib/planEmpty'
import { getPlanSetupMethod } from '@/lib/planSetup'
import { fetchExerciseRecommendation } from '@/lib/aiRecommendations'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { showImportWarnings } from '@/lib/importWarnings'
import { getAiToastKey } from '@/lib/aiErrors'
import { getDailyMotivation } from '@/lib/dailyMotivation'

function MotivationQuote({ lines }) {
  return (
    <div className="mb-4 pl-3 border-l-4 border-primary">
      {lines.map((line, index) => (
        <p
          key={index}
          className="text-3xl font-display font-extrabold tracking-tight leading-tight text-foreground"
        >
          {line.before}
          <span className="text-primary">{line.highlight}</span>
          {line.after}
        </p>
      ))}
    </div>
  )
}

function HomePage({ state, updateState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const today = todayDateString()
  const [aiLoading, setAiLoading] = useState(false)
  const showExerciseSetupPrompt = shouldShowExerciseSetupPrompt(state)
  const setupMethod = getPlanSetupMethod(state)
  const motivationLines = getDailyMotivation()

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
      showImportWarnings(result.warnings, { title: t('custom.aiNotesTitle') })
      toast.success(t('custom.toastAiApplied'))
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiLoading(false)
    }
  }

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

  return (
    <div className="relative p-4 md:p-6 pb-20 md:pb-6 min-h-[calc(100vh-12rem)] pt-4 md:pt-6">
      <GymFloatingPattern />
      <div className="relative z-10">
        <MotivationQuote lines={motivationLines} />

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

        {/* New user setup — full 3-option card directly on home page */}
        {showExerciseSetupPrompt && (
          <NewUserGetStartedCard
            aiLoading={aiLoading}
            onAiGenerate={handleAiExerciseRecommend}
            setupMethod={setupMethod}
            state={state}
            updateState={updateState}
          />
        )}
      </div>
    </div>
  )
}

export default HomePage
