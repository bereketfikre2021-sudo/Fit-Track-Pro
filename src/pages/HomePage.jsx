import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import GymFloatingPattern from '../components/GymFloatingPattern'
import TodayWorkoutCard from '../components/TodayWorkoutCard'
import WaterTracker from '../components/WaterTracker'
import BannerAdSpacer from '../components/BannerAdSpacer'
import { useAds } from '../lib/useAds'
import { canStartWorkoutForDay } from '@/lib/calendarDay'
import {
  getTodaySessionForDay,
  skipWorkoutForToday,
  startWorkoutSession,
  todayDateString,
} from '@/lib/workoutSession'
import { translateWeekday } from '@/lib/i18nHelpers'
import { getDailyMotivation } from '@/lib/dailyMotivation'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

// ── Upgrade CTA for free users ────────────────────────────────────────────────
function UpgradeCta() {
  const navigate = useNavigate()
  const [isFree, setIsFree] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_subscriptions')
        .select('id, status, plan:subscription_plans(tier)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          const tier = data?.plan?.tier
          const status = data?.status
          if (!data || tier === 'free' || status === 'expired' || status === 'cancelled') setIsFree(true)
        })
    })
  }, [])

  if (!isFree) return null

  return (
    <button
      onClick={() => navigate('/subscription')}
      className="w-full flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3.5 text-left hover:bg-primary/10 active:scale-[0.99] transition-all"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Zap className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
        <p className="text-xs text-muted-foreground mt-0.5">Unlock AI coaching, no ads, and more</p>
      </div>
      <span className="text-xs font-bold text-primary">Upgrade →</span>
    </button>
  )
}

function MotivationQuote({ lines }) {
  return (
    <div className="pl-3 border-l-4 border-primary">
      {lines.map((line, index) => (
        <p
          key={index}
          className="
            font-display font-extrabold tracking-tight leading-tight text-foreground
            text-3xl md:text-4xl lg:text-4xl xl:text-5xl
          "
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

  /**
   * Ad setup for Home screen:
   *   - Banner: shown at the bottom (reserved by <BannerAdSpacer />)
   *   - Interstitial: preloaded here so it's ready after workout completion
   *     (WorkoutTab calls AdService.showInterstitial() after session finish)
   *
   * No ads are shown during active workout sessions — the useAds hook only
   * renders the banner on THIS screen, not on /workout.
   */
  useAds({ banner: true, preloadInterstitial: true })

  const handleStartSession = (day) => {
    const workoutDays = state.profile?.workoutDays || []
    const transfer = state.transferredWorkouts?.[today]
    const isTransferredToToday = !!(transfer && transfer.fromDay === day)

    if (!isTransferredToToday && !canStartWorkoutForDay(day, workoutDays)) {
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

  /**
   * Transfer today's workout to a rest day.
   * Records a one-time transfer entry — does NOT permanently modify the
   * weekly schedule or workoutDays. The transferred workout appears on
   * the Home card on the target date, and the streak is preserved.
   */
  const handleTransferToday = (fromDay, toDay) => {
    const fromSchedule = state.workoutSchedule?.[fromDay]
    if (!fromSchedule?.exercises?.length) {
      toast.error('No exercises to transfer.')
      return
    }

    // Calculate the date of the target rest day this week
    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const todayDate = new Date()
    const todayIdx = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1 // Mon=0
    const toIdx = DAYS_OF_WEEK.indexOf(toDay)
    let daysAhead = toIdx - todayIdx
    if (daysAhead <= 0) daysAhead += 7
    const targetDate = new Date(todayDate)
    targetDate.setDate(todayDate.getDate() + daysAhead)
    const targetDateStr = targetDate.toISOString().slice(0, 10)

    // Store the transfer — keyed by target date
    const updatedTransfers = {
      ...(state.transferredWorkouts || {}),
      [targetDateStr]: { fromDay, toDay, transferredAt: Date.now() },
    }

    // Also mark today's session as skipped with reason 'transfer'
    // so the Start / Skip buttons hide and the card shows the transferred message
    const skipUpdate = skipWorkoutForToday(state, fromDay, 'transfer', today)

    updateState({
      ...skipUpdate,
      transferredWorkouts: updatedTransfers,
    })

    toast.success(
      `Workout moved to ${translateWeekday(toDay)} (${targetDateStr.slice(5).replace('-', '/')}). Your streak is safe!`,
      { duration: 5000 }
    )
  }

  return (
    <div className="px-3 pt-4 pb-24 md:pb-8 md:px-6 max-w-2xl mx-auto">
      {/* Floating gym pattern sits behind everything */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30" aria-hidden>
        <GymFloatingPattern />
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Daily motivation quote */}
        <MotivationQuote lines={motivationLines} />

        {/* Upgrade CTA for free users — pulled from Supabase subscription status */}
        <UpgradeCta state={state} />

        {/* Today's workout */}
        <TodayWorkoutCard
          workoutDays={state.profile?.workoutDays || []}
          workoutSchedule={state.workoutSchedule || {}}
          completedExercises={state.completedExercises || {}}
          completedSessions={state.completedSessions || []}
          transferredWorkouts={state.transferredWorkouts || {}}
          today={today}
          activeSession={state.activeWorkoutSession || null}
          onStartSession={handleStartSession}
          onSkipToday={handleSkipToday}
          onTransferToday={handleTransferToday}
        />

        {/* Water intake */}
        <WaterTracker state={state} updateState={updateState} today={today} />

        {/* Space reserved for the native AdMob banner (Capacitor only) */}
        <BannerAdSpacer />
      </div>
    </div>
  )
}

export default HomePage
