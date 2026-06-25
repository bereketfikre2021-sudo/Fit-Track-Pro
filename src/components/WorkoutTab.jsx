import { useEffect, useState, useCallback } from 'react'
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
import SkipExerciseDialog from './SkipExerciseDialog'
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
  inferExercisePhase,
  isSimplePhase,
} from '@/lib/exercisePhase'

import {

  areAllMainExercisesCompleted,

  completionKey,

  finishWorkoutSession,

  getAllExercisesForDay,

  areAllExercisesCompleted,

  getMainExercisesForDay,

  getTodaySessionForDay,

  skipWorkoutForToday,

  startWorkoutSession,

  todayDateString,

} from '@/lib/workoutSession'

import { toast } from 'sonner'
import { translateWeekday } from '@/lib/i18nHelpers'
import AiRecommendButton from './AiRecommendButton'
import { fetchExerciseRecommendation } from '@/lib/aiRecommendations'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { showImportWarnings } from '@/lib/importWarnings'
import { getAiToastKey } from '@/lib/aiErrors'



const sharedRadius = 'rounded-md'

function WorkoutExerciseEmptyActions({ showAiRecommend, aiLoading, onAiRecommend, t }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {showAiRecommend && (
        <AiRecommendButton
          loading={aiLoading}
          label={t('ai.exerciseLabel')}
          onClick={onAiRecommend}
        />
      )}
      <Button variant="outline" asChild>
        <Link to="/exercises">
          <Plus className="h-4 w-4 mr-2" />
          {t('workout.addExercises')}
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/exercises?tab=templates">
          <Calendar className="h-4 w-4 mr-2" />
          Use Template
        </Link>
      </Button>
    </div>
  )
}

/** Return the first phase (warmup → main → cooldown) that has exercises for a day. */
function getFirstPhaseWithExercises(exercises, customExercises) {
  const enriched = (exercises || []).map((ex) => {
    const library = customExercises.find((c) => c.id === ex.exerciseId)
    return { ...ex, exercisePhase: inferExercisePhase({ ...library, ...ex }) }
  })
  for (const phase of [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN]) {
    if (enriched.some((ex) => ex.exercisePhase === phase)) return phase
  }
  return EXERCISE_PHASE.MAIN
}

/** Return the next phase in the warmup → main → cooldown sequence. */
function getNextPhase(currentPhase) {
  const order = [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN]
  const idx = order.indexOf(currentPhase)
  return idx !== -1 && idx < order.length - 1 ? order[idx + 1] : null
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
    const days = state.profile?.workoutDays || []
    const ctx = getTodayWorkoutContext(days)
    const day = ctx.planDay || ctx.nextWorkoutDay || days[0] || null
    const exercises = state.workoutSchedule?.[day]?.exercises || []
    return getFirstPhaseWithExercises(exercises, state.customExercises || [])
  })
  const [restTimer, setRestTimer] = useState(null)
  const [holdTimer, setHoldTimer] = useState(null)
  const [skipTarget, setSkipTarget] = useState(null)
  const [skipDayOpen, setSkipDayOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const workoutSchedule = state.workoutSchedule || {}

  const workoutDays = state.profile?.workoutDays || []

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

  // Auto-advance phase: when all exercises in the current phase are done/skipped,
  // automatically move to the next phase (warmup → main → cooldown).
  useEffect(() => {
    if (!activeDay) return
    const dayExercises = workoutSchedule[activeDay]?.exercises || []
    if (!dayExercises.length) return

    const enriched = dayExercises.map((ex) => {
      const library = customExercises.find((c) => c.id === ex.exerciseId)
      return { ...ex, exercisePhase: inferExercisePhase({ ...library, ...ex }) }
    })

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
  }, [completedExercises, phaseFilter, activeDay, workoutSchedule, customExercises, today, t])

  const startRestTimer = (seconds, label = t('common.rest')) => {
    setHoldTimer(null)
    const sec = Math.max(1, seconds)
    setRestTimer({
      endsAt: Date.now() + sec * 1000,
      totalSeconds: sec,
      label,
    })
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
        startRestTimer(restSec, scheduled?.name || library?.name)
      }

      const updates = { completedExercises: newCompleted }

      if (allDone) {
        // All phases done — clear timers and finish session
        setRestTimer(null)
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

  const handleSkipExercise = (day, scheduleExerciseId, reason) => {
    if (day !== todayCtx.calendarToday) {
      toast.error(t('workout.toastOnlyToday', { day: translateWeekday(todayCtx.calendarToday) }))
      return
    }
    const key = completionKey(today, day, scheduleExerciseId)
    const scheduled = workoutSchedule[day]?.exercises?.find((e) => e.id === scheduleExerciseId)
    const library = scheduled?.exerciseId
      ? customExercises.find((c) => c.id === scheduled.exerciseId)
      : null

    updateState({
      completedExercises: {
        ...completedExercises,
        [key]: {
          date: today,
          day,
          exerciseId: scheduleExerciseId,
          skipped: true,
          skipReason: reason,
          skippedAt: Date.now(),
          libraryExerciseId: library?.id,
        },
      },
    })
    toast.success(t('workout.toastSkipped'))
  }

  const handleUnskipExercise = (day, scheduleExerciseId) => {
    if (day !== todayCtx.calendarToday) {
      toast.error(t('workout.toastOnlyToday', { day: translateWeekday(todayCtx.calendarToday) }))
      return
    }
    const key = completionKey(today, day, scheduleExerciseId)
    const newCompleted = { ...completedExercises }
    delete newCompleted[key]
    updateState({ completedExercises: newCompleted })
    toast.success(t('workout.toastSkipRemoved'))
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

        <Card>

          <CardContent className="flex flex-col items-center justify-center py-12">

            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />

            <p className="text-lg font-medium mb-2">{t('workout.noDaysTitle')}</p>

            <p className="text-sm text-muted-foreground mb-4 text-center">

              {t('workout.noDaysDesc')}

            </p>

            <WorkoutExerciseEmptyActions
              showAiRecommend
              aiLoading={aiLoading}
              onAiRecommend={handleAiExerciseRecommend}
              t={t}
            />

          </CardContent>

        </Card>

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
          setPhaseFilter(getFirstPhaseWithExercises(exercises, customExercises))
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

          const mainExercises = daySchedule.exercises.filter((ex) => {
            const library = customExercises.find((c) => c.id === ex.exerciseId)
            return (
              inferExercisePhase({
                ...library,
                ...ex,
              }) === EXERCISE_PHASE.MAIN
            )
          })
          const mainExerciseCount = mainExercises.length
          const completedToday = mainExercises.reduce(
            (acc, ex) => acc + (isExerciseCompleted(day, ex.id) ? 1 : 0),
            0
          )

          const todaySession = getTodaySessionForDay(completedSessions, day, today)



          return (

            <TabsContent key={day} value={day} className="space-y-4">

              <WorkoutSessionBar

                day={day}

                activeSession={activeSession}

                dayExerciseCount={mainExerciseCount}

                completedExercises={completedExercises}

                todaySession={todaySession}
                completedCount={completedToday}

              />

              {!readOnly && mainExerciseCount > 0 && !todaySession && (
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

              {exerciseCount > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Tabs value={phaseFilter} onValueChange={setPhaseFilter}>
                    <TabsList className="h-auto">
                      <TabsTrigger value={EXERCISE_PHASE.WARMUP}>{t('exercisePhase.warmup.short')}</TabsTrigger>
                      <TabsTrigger value={EXERCISE_PHASE.MAIN}>{t('exercisePhase.main.short')}</TabsTrigger>
                      <TabsTrigger value={EXERCISE_PHASE.COOLDOWN}>{t('exercisePhase.cooldown.short')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground px-1">
                    {t('workout.shown', {
                      count: filterExercisesByPhase(daySchedule.exercises, phaseFilter).length,
                    })}
                  </p>
                </div>
              )}



              {exerciseCount === 0 ? (

                <Card>

                  <CardContent className="flex flex-col items-center justify-center py-12">

                    <Dumbbell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />

                    <p className="text-lg font-medium mb-2">{t('workout.noExercisesTitle')}</p>

                    <p className="text-sm text-muted-foreground mb-4 text-center">

                      {customExercises.length > 0

                        ? t('workout.noExercisesDay', { day: translateWeekday(day) })

                        : t('workout.noExercisesGeneral')}

                    </p>

                    <WorkoutExerciseEmptyActions
                      showAiRecommend
                      aiLoading={aiLoading}
                      onAiRecommend={handleAiExerciseRecommend}
                      t={t}
                    />

                  </CardContent>

                </Card>

              ) : (

                <div className="space-y-5">

                  {(() => {
                    const enriched = daySchedule.exercises.map((ex) => {
                      const library = customExercises.find((c) => c.id === ex.exerciseId)
                      return {
                        ...ex,
                        exercisePhase: inferExercisePhase({
                          ...library,
                          ...ex,
                        }),
                      }
                    })

                    const filtered = filterExercisesByPhase(enriched, phaseFilter)

                    const groups = [
                      {
                        phase: phaseFilter,
                        label:
                          phaseFilter === EXERCISE_PHASE.WARMUP
                            ? t('exercisePhase.warmup.short')
                            : phaseFilter === EXERCISE_PHASE.COOLDOWN
                              ? t('exercisePhase.cooldown.short')
                              : t('exercisePhase.main.short'),
                        exercises: filtered,
                      },
                    ].filter((g) => g.exercises.length > 0)

                    return groups.map((group) => (

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
                            readOnly={readOnly}
                            onSaveEntry={
                              readOnly ? undefined : (patch) => saveCompletionEntry(day, ex.id, patch)
                            }
                            onToggleComplete={
                              readOnly ? undefined : () => toggleExerciseCompletion(day, ex.id)
                            }
                            onSkip={
                              readOnly
                                ? undefined
                                : () =>
                                    setSkipTarget({
                                      day,
                                      scheduleExerciseId: ex.id,
                                      name: ex.name,
                                    })
                            }
                            onUnskip={
                              readOnly ? undefined : () => handleUnskipExercise(day, ex.id)
                            }
                            onStartRest={
                              readOnly ? undefined : (seconds, label) => startRestTimer(seconds, label)
                            }
                            onStartHold={
                              readOnly ? undefined : (seconds, label) => startHoldTimer(seconds, label)
                            }
                          />

                        ))}

                      </div>

                    </div>

                  ))
                  })()}

                </div>

              )}



            </TabsContent>

          )

        })}

      </Tabs>

      <RestTimer
        timer={restTimer}
        onStop={() => setRestTimer(null)}
        onExtend={extendRestTimer}
        playSound={appSettings.restTimerSound}
        vibrate={appSettings.restTimerVibrate}
      />

      <HoldTimer
        timer={holdTimer}
        onStop={() => setHoldTimer(null)}
        playSound={appSettings.restTimerSound}
        vibrate={appSettings.restTimerVibrate}
      />

      <SkipExerciseDialog
        open={!!skipTarget}
        onOpenChange={(open) => !open && setSkipTarget(null)}
        exerciseName={skipTarget?.name || ''}
        onConfirm={(reason) => {
          if (skipTarget) {
            handleSkipExercise(skipTarget.day, skipTarget.scheduleExerciseId, reason)
          }
          setSkipTarget(null)
        }}
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
