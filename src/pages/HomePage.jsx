import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import GymFloatingPattern from '../components/GymFloatingPattern'
import TodayWorkoutCard from '../components/TodayWorkoutCard'
import WaterTracker from '../components/WaterTracker'
import { canStartWorkoutForDay } from '@/lib/calendarDay'
import {
  getTodaySessionForDay,
  skipWorkoutForToday,
  startWorkoutSession,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getDailyMotivation } from '@/lib/dailyMotivation'

function MotivationQuote({ lines }) {
  return (
    <div className="mb-2 pl-3 border-l-4 border-primary">
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
  const motivationLines = getDailyMotivation()

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
    <div className="relative -mt-10 px-3 pb-20 md:pb-6 md:px-6 md:mt-0">
      <GymFloatingPattern />
      <div className="relative z-10 flex flex-col gap-2">
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
      </div>
    </div>
  )
}

export default HomePage
