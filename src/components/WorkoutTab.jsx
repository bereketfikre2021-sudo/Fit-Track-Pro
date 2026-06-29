import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Link, useNavigate } from 'react-router-dom'

import { Calendar, Dumbbell, Plus } from 'lucide-react'

import confetti from 'canvas-confetti'

import { Card, CardContent } from './ui/card'

import { Button } from './ui/button'

import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

import WorkoutSessionBar from './WorkoutSessionBar'
import RestTimer from './RestTimer'
import HoldTimer from './HoldTimer'
import SkipDayDialog from './SkipDayDialog'
import { ExerciseWorkoutCard } from './ExerciseCard'
import { parseRestSeconds } from '@/lib/restTimer'
import { createHoldTimer } from '@/lib/holdTimer'
import { getAppSettings } from '@/lib/appSettings'
import { buildDefaultSets, migrateCompletionEntry } from '@/lib/setLogging'
import { isCompletedEntry } from '@/lib/exerciseSkip'

import { cn } from '@/lib/utils'

import { getTodayWorkoutContext } from '@/lib/calendarDay'

import {
  EXERCISE_PHASE,
  filterExercisesByPhase,
  getExercisePhaseLabel,
  inferExercisePhase,
  isSimplePhase,
} from '@/lib/exercisePhase'

import {

  areAllMainExercisesCompleted,

  canAccessWorkoutPhase,

  completionKey,

  countDayExerciseProgress,

  enrichScheduleExercises,

  finishWorkoutSession,

  getAllExercisesForDay,

  areAllExercisesCompleted,

  getCurrentWorkoutPhase,

  getMainExercisesForDay,

  getTodaySessionForDay,

  skipWorkoutForToday,

  startWorkoutSession,

  todayDateString,

} from '@/lib/workoutSession'

import { toast } from 'sonner'
import { translateWeekday } from '@/lib/i18nHelpers'
import AiRecommendButton, { NewUserGetStartedCard } from './AiRecommendButton'
import { fetchExerciseRecommendation } from '@/lib/aiRecommendations'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { showImportWarnings } from '@/lib/importWarnings'
import { getAiToastKey } from '@/lib/aiErrors'
import {
  allowsTemplatePlanFeatures,
  getPlanSetupMethod,
} from '@/lib/planSetup'



const sharedRadius = 'rounded-md'

function WorkoutExerciseEmptyActions({ t, dayLabel, noDays, showTemplateLink, showManualLink }) {
  return (
    <Card className="border-primary/30 bg-primary/5 w-full">
      <CardContent className="py-5 space-y-4">
        <div>
          <p className="font-medium">
            {noDays ? t('workout.noDaysTitle') : t('workout.noExercisesTitle')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {noDays
              ? t('workout.noDaysDesc')
              : dayLabel
                ? t('workout.noExercisesDay', { day: dayLabel })
                : t('workout.noExercisesGeneral')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showTemplateLink && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/exercises?tab=templates">
                <Calendar className="h-4 w-4 mr-2" />
                {t('exercises.tabTemplates')}
              </Link>
            </Button>
          )}
          {showManualLink && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/exercises">
                <Plus className="h-4 w-4 mr-2" />
                {t('workout.addExercises')}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const WORKOUT_PHASE_ORDER = [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN]

/** Return the first phase that has at least one exercise, falling back to MAIN */
function getDefaultPhase(exercises = []) {
  for (const phase of WORKOUT_PHASE_ORDER) {
    if (exercises.some((ex) => (ex.exercisePhase || inferExercisePhase(ex)) === phase)) {
      return phase
    }
  }
  return EXERCISE_PHASE.MAIN
}

/** Return the next phase in the warmup → main → cooldown sequence. */
function getNextPhase(currentPhase) {
  const idx = WORKOUT_PHASE_ORDER.indexOf(currentPhase)
  return idx !== -1 && idx < WORKOUT_PHASE_ORDER.length - 1 ? WORKOUT_PHASE_ORDER[idx + 1] : null
}

function getPhaseFilterLabel(phase, t) {
  if (phase === EXERCISE_PHASE.WARMUP) return t('exercisePhase.warmup.short')
  if (phase === EXERCISE_PHASE.COOLDOWN) return t('exercisePhase.cooldown.short')
  return t('exercisePhase.main.short')
}

function getPhaseFullLabel(phase, t) {
  if (phase === EXERCISE_PHASE.WARMUP) return t('exercisePhase.warmup.label')
  if (phase === EXERCISE_PHASE.COOLDOWN) return t('exercisePhase.cooldown.label')
  return t('exercisePhase.main.label')
}

function getPhaseIcon(phase) {
  if (phase === EXERCISE_PHASE.WARMUP) return '🔥'
  if (phase === EXERCISE_PHASE.COOLDOWN) return '❄️'
  return '💪'
}

function buildWorkoutPhaseGroups(enriched, phaseFilter, { allPhases }, t) {
  const phases = allPhases ? WORKOUT_PHASE_ORDER : [phaseFilter]
  return phases
    .map((phase) => ({
      phase,
      label: getPhaseFilterLabel(phase, t),
      fullLabel: getPhaseFullLabel(phase, t),
      icon: getPhaseIcon(phase),
      exercises: filterExercisesByPhase(enriched, phase),
    }))
    .filter((g) => g.exercises.length > 0)
}

function WorkoutTab({ state, updateState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Single clean pop from the centre-bottom, then show a brief celebration
  // overlay before navigating home.
  const celebrateAndGoHome = useCallback(() => {
    // One quick double-pop — left and right of centre, no loop
    confetti({
      particleCount: 80,
      angle: 75,
      spread: 55,
      startVelocity: 45,
      decay: 0.88,
      origin: { x: 0.4, y: 0.95 },
      colors: ['#22c55e', '#facc15', '#f97316', '#a78bfa', '#38bdf8'],
      scalar: 1.1,
    })
    confetti({
      particleCount: 80,
      angle: 105,
      spread: 55,
      startVelocity: 45,
      decay: 0.88,
      origin: { x: 0.6, y: 0.95 },
      colors: ['#22c55e', '#facc15', '#f97316', '#a78bfa', '#38bdf8'],
      scalar: 1.1,
    })

    setCelebrating(true)
    setTimeout(() => {
      setCelebrating(false)
      navigate('/')
    }, 2200)
  }, [navigate])

  const [activeDay, setActiveDay] = useState(() => {

    const workoutDays = state.profile?.workoutDays || []

    const ctx = getTodayWorkoutContext(workoutDays)
    return ctx.planDay || ctx.nextWorkoutDay || workoutDays[0] || null

  })

  const [phaseFilter, setPhaseFilter] = useState(() => {
    const workoutDays = state.profile?.workoutDays || []
    const ctx = getTodayWorkoutContext(workoutDays)
    const day = ctx.planDay || ctx.nextWorkoutDay || workoutDays[0] || null
    const exercises = day ? (state.workoutSchedule?.[day]?.exercises || []) : []
    return getDefaultPhase(exercises)
  })
  const [completedPhaseFilter, setCompletedPhaseFilter] = useState(EXERCISE_PHASE.MAIN)
  const [restTimer, setRestTimer] = useState(null)
  const [restNextExercise, setRestNextExercise] = useState(null)
  const [holdTimer, setHoldTimer] = useState(null)
  const [skipDayOpen, setSkipDayOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const sessionStartedAtRef = useRef(null)

  const workoutSchedule = state.workoutSchedule || {}

  const workoutDays = state.profile?.workoutDays || []
  const setupMethod = getPlanSetupMethod(state)
  const showTemplateFeatures = allowsTemplatePlanFeatures(state)
  const showManualFeatures = setupMethod === null || setupMethod === 'manual'

  const customExercises = state.customExercises || []

  const completedExercises = state.completedExercises || {}

  const activeSession = state.activeWorkoutSession || null

  const completedSessions = state.completedSessions || []

  const today = todayDateString()
  const todayCtx = getTodayWorkoutContext(workoutDays)
  const appSettings = getAppSettings(state)

  useEffect(() => {
    if (!workoutDays.length) return
    if (activeDay && workoutDays.includes(activeDay)) return
    const ctx = getTodayWorkoutContext(workoutDays)
    setActiveDay(ctx.planDay || ctx.nextWorkoutDay || workoutDays[0] || null)
  }, [activeDay, workoutDays])

  // When a new session starts (e.g. from home), open on warm-up first.
  useEffect(() => {
    if (!activeSession || activeSession.date !== today) return
    if (activeSession.startedAt === sessionStartedAtRef.current) return
    sessionStartedAtRef.current = activeSession.startedAt
    if (activeSession.day === activeDay) {
      const exercises = workoutSchedule[activeDay]?.exercises || []
      setPhaseFilter(getDefaultPhase(enrichScheduleExercises(exercises, customExercises)))
    }
  }, [activeSession, activeDay, today])

  const tryChangePhase = (day, targetPhase, enriched, readOnly) => {
    if (readOnly || canAccessWorkoutPhase(targetPhase, enriched, completedExercises, day, today)) {
      setPhaseFilter(targetPhase)
      return
    }

    const blockedPhase =
      targetPhase === EXERCISE_PHASE.MAIN ? EXERCISE_PHASE.WARMUP : EXERCISE_PHASE.MAIN
    toast.error(
      t('workout.phaseLocked', {
        phase: getExercisePhaseLabel(blockedPhase),
      })
    )
  }

  // Keep the visible tab on the earliest incomplete phase during today's workout.
  useEffect(() => {
    if (!activeDay || activeDay !== todayCtx.calendarToday) return
    if (getTodaySessionForDay(completedSessions, activeDay, today)) return
    const dayExercises = workoutSchedule[activeDay]?.exercises || []
    if (!dayExercises.length) return

    const enriched = enrichScheduleExercises(dayExercises, customExercises)
    if (canAccessWorkoutPhase(phaseFilter, enriched, completedExercises, activeDay, today)) return

    setPhaseFilter(getCurrentWorkoutPhase(enriched, completedExercises, activeDay, today))
  }, [completedExercises, completedSessions, phaseFilter, activeDay, workoutSchedule, customExercises, today, todayCtx.calendarToday])

  // Auto-advance phase: when all exercises in the current phase are done/skipped,
  // automatically move to the next phase (warmup → main → cooldown).
  useEffect(() => {
    if (!activeDay) return
    if (getTodaySessionForDay(completedSessions, activeDay, today)) return
    const dayExercises = workoutSchedule[activeDay]?.exercises || []
    if (!dayExercises.length) return

    const enriched = enrichScheduleExercises(dayExercises, customExercises)

    const phaseExercises = enriched.filter((ex) => ex.exercisePhase === phaseFilter)
    if (!phaseExercises.length) return

    const allDone = phaseExercises.every((ex) => {
      const entry = completedExercises[completionKey(today, activeDay, ex.id)]
      return entry && (entry.completedAt || entry.skipped)
    })

    if (!allDone) return

    const next = getNextPhase(phaseFilter)
    if (!next) return

    // Only advance if the next phase actually has exercises
    const nextHasExercises = enriched.some((ex) => ex.exercisePhase === next)
    if (!nextHasExercises) return

    const phaseLabel = next === EXERCISE_PHASE.MAIN
      ? t('exercisePhase.main.short')
      : next === EXERCISE_PHASE.COOLDOWN
        ? t('exercisePhase.cooldown.short')
        : t('exercisePhase.warmup.short')

    setPhaseFilter(next)
    toast.success(
      t('workout.phaseAdvance', {
        phase: phaseLabel,
        defaultValue: `Moving to ${phaseLabel}`,
      })
    )
  }, [completedExercises, completedSessions, phaseFilter, activeDay, workoutSchedule, customExercises, today, t])

  const isSessionFinishedForDay = (day) =>
    !!getTodaySessionForDay(completedSessions, day, today)

  const startRestTimer = (seconds, label = t('common.rest'), nextEx = null) => {
    setHoldTimer(null)
    const sec = Math.max(1, seconds)
    setRestTimer({
      endsAt: Date.now() + sec * 1000,
      totalSeconds: sec,
      label,
    })
    setRestNextExercise(nextEx)
  }

  const startHoldTimer = (seconds, label) => {
    setRestTimer(null)
    setHoldTimer(createHoldTimer(seconds, label))
  }

  const extendRestTimer = (extraSeconds) => {
    setRestTimer((prev) => {
      if (!prev) return prev
      const remaining = Math.max(0, Math.ceil((prev.endsAt - Date.now()) / 1000))
      const total = remaining + extraSeconds
      return {
        ...prev,
        endsAt: Date.now() + total * 1000,
        totalSeconds: total,
      }
    })
  }

  const toggleExerciseCompletion = (day, scheduleExerciseId) => {
    if (day !== todayCtx.calendarToday) {
      toast.error(t('workout.toastOnlyToday', { day: translateWeekday(todayCtx.calendarToday) }))
      return
    }
    const key = completionKey(today, day, scheduleExerciseId)
    const newCompleted = { ...completedExercises }
    const existing = newCompleted[key]

    if (isCompletedEntry(existing)) {
      if (isSessionFinishedForDay(day)) {
        toast.error(t('workout.toastSessionLocked'))
        return
      }
      delete newCompleted[key]
      toast.success(t('workout.toastIncomplete'))
    } else {
      const scheduled = workoutSchedule[day]?.exercises?.find((e) => e.id === scheduleExerciseId)
      const library = scheduled?.exerciseId
        ? customExercises.find((c) => c.id === scheduled.exerciseId)
        : null
      const baseSets = existing?.sets?.length
        ? existing.sets
        : appSettings.enableSetLogging
          ? buildDefaultSets(scheduled, library)
          : []
      newCompleted[key] = migrateCompletionEntry(
        {
          ...(existing || { notes: '', libraryExerciseId: library?.id }),
          sets: baseSets,
          completedAt: Date.now(),
          date: today,
          day,
          exerciseId: scheduleExerciseId,
          libraryExerciseId: library?.id || existing?.libraryExerciseId,
        },
        scheduled,
        library
      )
      toast.success(t('workout.toastComplete'))
      const allExercises = getAllExercisesForDay(
        { workoutSchedule, customExercises },
        day
      )
      const mainExercises = getMainExercisesForDay(
        { workoutSchedule, customExercises },
        day
      )
      const allDone = areAllExercisesCompleted(
        newCompleted,
        allExercises,
        day,
        today
      )
      const allMainCompleted = areAllMainExercisesCompleted(
        newCompleted,
        mainExercises,
        day,
        today
      )
      const restSec = parseRestSeconds(
        scheduled?.restTime || library?.restTime,
        appSettings.defaultRestSeconds
      )

      // Only auto-start rest timer if this is NOT the last exercise
      if (
        appSettings.autoStartRestOnComplete &&
        !isSimplePhase(inferExercisePhase(library || scheduled || {})) &&
        !allDone
      ) {
        // Find the next incomplete exercise in the current phase for "up next" display
        const phaseExercises = enrichScheduleExercises(
          workoutSchedule[day]?.exercises || [], customExercises
        ).filter((ex) => ex.exercisePhase === phaseFilter)
        const currentIdx = phaseExercises.findIndex((ex) => ex.id === scheduleExerciseId)
        const nextEx = phaseExercises
          .slice(currentIdx + 1)
          .find((ex) => {
            const entry = newCompleted[completionKey(today, day, ex.id)]
            return !entry?.completedAt && !entry?.skipped
          })
        startRestTimer(restSec, scheduled?.name || library?.name, nextEx?.name || null)
      }

      const updates = { completedExercises: newCompleted }

      if (allDone) {
        // All phases done — clear timers and finish session
        setRestTimer(null)
        setRestNextExercise(null)
        setHoldTimer(null)

        const sessionToFinish =
          activeSession?.day === day && activeSession?.date === today
            ? activeSession
            : { day, date: today, startedAt: Date.now() }

        const finishUpdates = finishWorkoutSession(sessionToFinish, {
          ...state,
          completedExercises: newCompleted,
        })
        if (finishUpdates) {
          Object.assign(updates, finishUpdates)
          const session = finishUpdates.completedSessions[finishUpdates.completedSessions.length - 1]
          toast.success(
            t('workout.toastFinished', {
              completed: session.completedCount,
              total: session.totalCount,
            })
          )
          celebrateAndGoHome()
        }
      }

      updateState(updates)
      return
    }

    updateState({ completedExercises: newCompleted })
  }

  const handleSkipToday = (day, reason) => {
    if (day !== todayCtx.calendarToday) {
      toast.error(t('workout.toastOnlyToday', { day: translateWeekday(todayCtx.calendarToday) }))
      return
    }
    if (getTodaySessionForDay(completedSessions, day, today)) {
      toast.error(t('home.toastAlreadyDone'))
      return
    }
    updateState(skipWorkoutForToday(state, day, reason, today))
    toast.success(t('home.toastSkippedToday'))
  }

  const isExerciseCompleted = (day, scheduleExerciseId) => {
    const entry = completedExercises[completionKey(today, day, scheduleExerciseId)]
    return isCompletedEntry(entry)
  }



  const getCompletionEntry = (day, scheduleExerciseId) => {
    return completedExercises[completionKey(today, day, scheduleExerciseId)]
  }

  const saveCompletionEntry = (day, scheduleExerciseId, patch) => {
    if (day !== todayCtx.calendarToday) {
      toast.error(t('workout.toastOnlyToday', { day: translateWeekday(todayCtx.calendarToday) }))
      return
    }
    if (isSessionFinishedForDay(day)) {
      toast.error(t('workout.toastSessionLocked'))
      return
    }
    const key = completionKey(today, day, scheduleExerciseId)
    const scheduled = workoutSchedule[day]?.exercises?.find((e) => e.id === scheduleExerciseId)
    const library = scheduled?.exerciseId
      ? customExercises.find((c) => c.id === scheduled.exerciseId)
      : null
    const existing = completedExercises[key]
    const base = existing || {
      notes: '',
      sets: buildDefaultSets(scheduled, library),
      libraryExerciseId: library?.id,
    }
    const migrated = migrateCompletionEntry({ ...base, ...patch }, scheduled, library)

    updateState({
      completedExercises: {
        ...completedExercises,
        [key]: {
          ...migrated,
          date: today,
          day,
          exerciseId: scheduleExerciseId,
          completedAt: existing?.completedAt,
        },
      },
    })
  }



  const handleStartSession = (day) => {

    if (activeSession?.date === today) {

      toast.error(t('workout.toastFinishFirst', { day: translateWeekday(activeSession.day) }))

      return

    }

    updateState({ activeWorkoutSession: startWorkoutSession(day, today) })
    const exercises = workoutSchedule[day]?.exercises || []
    setPhaseFilter(getDefaultPhase(enrichScheduleExercises(exercises, customExercises)))

    toast.success(t('workout.toastStarted', { day: translateWeekday(day) }))

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

  if (workoutDays.length === 0) {

    return (

      <div className="p-4 md:p-6 pb-20 md:pb-6">

        <NewUserGetStartedCard
          aiLoading={aiLoading}
          onAiGenerate={handleAiExerciseRecommend}
          setupMethod={setupMethod}
        />

      </div>

    )

  }



  return (

    <div className="p-4 md:p-6 pb-20 md:pb-6">

      <Tabs
        value={activeDay}
        onValueChange={(day) => {
          setActiveDay(day)
          const exercises = workoutSchedule[day]?.exercises || []
          setPhaseFilter(getDefaultPhase(enrichScheduleExercises(exercises, customExercises)))
        }}
        className="w-full"
      >

        <TabsList className="w-full grid h-auto gap-2 bg-transparent p-0 mb-6" style={{ gridTemplateColumns: `repeat(${workoutDays.length}, minmax(0, 1fr))` }}>

          {workoutDays.map(day => (

            <TabsTrigger

              key={day}

              value={day}

              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"

            >

              {translateWeekday(day)}

            </TabsTrigger>

          ))}

        </TabsList>



        {workoutDays.map(day => {
          const readOnly = day !== todayCtx.calendarToday

          const daySchedule = workoutSchedule[day] || { note: '', exercises: [] }

          const exerciseCount = daySchedule.exercises.length
          const enrichedDayExercises = enrichScheduleExercises(daySchedule.exercises, customExercises)
          const mainExercises = enrichedDayExercises.filter(
            (ex) => ex.exercisePhase === EXERCISE_PHASE.MAIN
          )
          const mainExerciseCount = mainExercises.length
          const completedToday = mainExercises.reduce(
            (acc, ex) => acc + (isExerciseCompleted(day, ex.id) ? 1 : 0),
            0
          )
          const sessionActiveForDay =
            activeSession?.day === day && activeSession?.date === today
          const dayProgress = countDayExerciseProgress(
            completedExercises,
            daySchedule.exercises,
            day,
            today
          )

          const todaySession = getTodaySessionForDay(completedSessions, day, today)
          const sessionComplete = !readOnly && !!todaySession
          const workoutLocked = readOnly || sessionComplete

          return (

            <TabsContent key={day} value={day} className="space-y-4">

              <WorkoutSessionBar
                day={day}
                activeSession={activeSession}
                allExercises={daySchedule.exercises}
                completedExercises={completedExercises}
                todaySession={todaySession}
                progress={dayProgress}
              />

              {!readOnly && mainExerciseCount > 0 && !todaySession && !sessionActiveForDay && (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setSkipDayOpen(true)}>
                    {t('todayCard.skipToday')}
                  </Button>
                </div>
              )}

              {exerciseCount > 0 && (

                <p className="text-xs text-muted-foreground px-1">

                  {t('workout.todayProgress', {
                    completed: completedToday,
                    total: mainExerciseCount,
                  })}

                </p>

              )}

              {exerciseCount > 0 && !sessionComplete && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Tabs
                    value={phaseFilter}
                    onValueChange={(next) => tryChangePhase(day, next, enrichedDayExercises, readOnly)}
                  >
                    <TabsList className="h-auto">
                      <TabsTrigger value={EXERCISE_PHASE.WARMUP}>
                        <span className="mr-1" aria-hidden="true">🔥</span>
                        {t('exercisePhase.warmup.short')}
                      </TabsTrigger>
                      <TabsTrigger
                        value={EXERCISE_PHASE.MAIN}
                        disabled={
                          !readOnly &&
                          !canAccessWorkoutPhase(
                            EXERCISE_PHASE.MAIN,
                            enrichedDayExercises,
                            completedExercises,
                            day,
                            today
                          )
                        }
                      >
                        <span className="mr-1" aria-hidden="true">💪</span>
                        {t('exercisePhase.main.short')}
                      </TabsTrigger>
                      <TabsTrigger
                        value={EXERCISE_PHASE.COOLDOWN}
                        disabled={
                          !readOnly &&
                          !canAccessWorkoutPhase(
                            EXERCISE_PHASE.COOLDOWN,
                            enrichedDayExercises,
                            completedExercises,
                            day,
                            today
                          )
                        }
                      >
                        <span className="mr-1" aria-hidden="true">❄️</span>
                        {t('exercisePhase.cooldown.short')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground px-1">
                    {t('workout.shown', {
                      count: filterExercisesByPhase(daySchedule.exercises, phaseFilter).length,
                    })}
                  </p>
                </div>
              )}

              {exerciseCount > 0 && sessionComplete && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Tabs
                    value={completedPhaseFilter}
                    onValueChange={(v) => setCompletedPhaseFilter(v)}
                  >
                    <TabsList className="h-auto">
                      {buildWorkoutPhaseGroups(enrichedDayExercises, phaseFilter, { allPhases: true }, t).map((group) => (
                        <TabsTrigger key={group.phase} value={group.phase}>
                          <span className="mr-1" aria-hidden="true">{group.icon}</span>
                          {group.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground px-1">
                    {t('workout.shown', {
                      count: filterExercisesByPhase(enrichedDayExercises, completedPhaseFilter).length,
                    })}
                  </p>
                </div>
              )}



              {exerciseCount === 0 ? (

                <WorkoutExerciseEmptyActions
                  dayLabel={customExercises.length > 0 ? translateWeekday(day) : null}
                  t={t}
                  showTemplateLink={showTemplateFeatures}
                  showManualLink={showManualFeatures}
                />

              ) : (

                <div className="space-y-3">

                  {(() => {
                    const enriched = enrichedDayExercises

                    // After session complete: show only the selected tab's phase
                    // During active session: show the current phaseFilter group
                    const activePhase = sessionComplete ? completedPhaseFilter : phaseFilter
                    const groups = buildWorkoutPhaseGroups(enriched, activePhase, {
                      allPhases: false,
                    }, t)

                    // If the selected completed tab has no exercises, fall back gracefully
                    const visibleExercises = groups[0]?.exercises || []

                    return (
                      <>
                        {!sessionComplete && groups.map((group) => (
                          <div key={group.phase} className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                              {group.label}
                            </h3>
                            <div className="flex flex-col gap-3">
                              {group.exercises.map((ex, i) => (
                                <ExerciseWorkoutCard
                                  key={ex.id || i}
                                  exercise={ex}
                                  day={day}
                                  customExercises={customExercises}
                                  completedExercises={completedExercises}
                                  isCompleted={isExerciseCompleted(day, ex.id)}
                                  completionEntry={getCompletionEntry(day, ex.id)}
                                  enableSetLogging={appSettings.enableSetLogging}
                                  readOnly={workoutLocked}
                                  onSaveEntry={workoutLocked ? undefined : (patch) => saveCompletionEntry(day, ex.id, patch)}
                                  onToggleComplete={workoutLocked ? undefined : () => toggleExerciseCompletion(day, ex.id)}
                                  onStartRest={workoutLocked ? undefined : (seconds, label) => startRestTimer(seconds, label)}
                                  onStartHold={workoutLocked ? undefined : (seconds, label) => startHoldTimer(seconds, label)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        {sessionComplete && (
                          <div className="flex flex-col gap-3">
                            {visibleExercises.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                                {t('exercisePhase.' + completedPhaseFilter + '.description', { defaultValue: 'No exercises in this phase.' })}
                              </p>
                            ) : visibleExercises.map((ex, i) => (
                              <ExerciseWorkoutCard
                                key={ex.id || i}
                                exercise={ex}
                                day={day}
                                customExercises={customExercises}
                                completedExercises={completedExercises}
                                isCompleted={isExerciseCompleted(day, ex.id)}
                                completionEntry={getCompletionEntry(day, ex.id)}
                                enableSetLogging={appSettings.enableSetLogging}
                                readOnly={true}
                                onSaveEntry={undefined}
                                onToggleComplete={undefined}
                                onStartRest={undefined}
                                onStartHold={undefined}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}

                </div>

              )}



            </TabsContent>

          )

        })}

      </Tabs>

      <RestTimer
        timer={restTimer}
        onStop={() => { setRestTimer(null); setRestNextExercise(null) }}
        onExtend={extendRestTimer}
        nextExercise={restNextExercise}
        playSound={appSettings.restTimerSound}
        vibrate={appSettings.restTimerVibrate}
      />

      <HoldTimer
        timer={holdTimer}
        onStop={() => setHoldTimer(null)}
        playSound={appSettings.restTimerSound}
        vibrate={appSettings.restTimerVibrate}
      />

      <SkipDayDialog
        open={skipDayOpen}
        onOpenChange={setSkipDayOpen}
        dayLabel={translateWeekday(todayCtx.calendarToday)}
        onConfirm={(reason) => handleSkipToday(todayCtx.calendarToday, reason)}
      />

      {/* Workout complete celebration overlay */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-background/90 backdrop-blur-sm border border-border rounded-2xl px-10 py-8 shadow-2xl pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
            <span className="text-6xl" role="img" aria-label="trophy">🏆</span>
            <p className="text-xl font-bold text-foreground">
              {t('workout.celebrateTitle', { defaultValue: 'Workout Complete!' })}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {t('workout.celebrateSubtitle', { defaultValue: 'Amazing work — you crushed it! 💪' })}
            </p>
          </div>
        </div>
      )}

    </div>

  )

}

export default WorkoutTab
