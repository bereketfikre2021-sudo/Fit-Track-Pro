import { EXERCISE_PHASE, inferExercisePhase } from './exercisePhase'

export function todayDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function completionKey(date, day, scheduleExerciseId) {
  return `${date}-${day}-${scheduleExerciseId}`
}

export function countDayCompletions(completedExercises, day, date = todayDateString()) {
  return Object.values(completedExercises || {}).filter(
    (entry) =>
      entry.day === day &&
      entry.date === date &&
      entry.completedAt &&
      !entry.skipped
  ).length
}

/** Completed or skipped exercises vs total scheduled for a day. */
export function countDayExerciseProgress(
  completedExercises,
  allExercises,
  day,
  date = todayDateString()
) {
  const total = allExercises?.length || 0
  const done = (allExercises || []).reduce((acc, ex) => {
    const entry = completedExercises?.[completionKey(date, day, ex.id)]
    return acc + (entry && (entry.completedAt || entry.skipped) ? 1 : 0)
  }, 0)
  return {
    done,
    total,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

export function enrichScheduleExercises(exercises, customExercises) {
  return (exercises || []).map((ex) => {
    const library = customExercises.find((c) => c.id === ex.exerciseId)
    return { ...ex, exercisePhase: inferExercisePhase({ ...library, ...ex }) }
  })
}

export function getPhaseExercises(enriched, phase) {
  return enriched.filter((ex) => ex.exercisePhase === phase)
}

export function isPhaseComplete(completedExercises, phaseExercises, day, date = todayDateString()) {
  if (!phaseExercises.length) return true
  return phaseExercises.every((ex) => {
    const entry = completedExercises?.[completionKey(date, day, ex.id)]
    return entry && (entry.completedAt || entry.skipped)
  })
}

/** Whether the user may open a workout phase tab (prior phases must be done or skipped). */
export function canAccessWorkoutPhase(
  targetPhase,
  enriched,
  completedExercises,
  day,
  date = todayDateString()
) {
  if (targetPhase === EXERCISE_PHASE.WARMUP) return true

  const warmupDone = isPhaseComplete(
    completedExercises,
    getPhaseExercises(enriched, EXERCISE_PHASE.WARMUP),
    day,
    date
  )
  if (targetPhase === EXERCISE_PHASE.MAIN) return warmupDone

  if (targetPhase === EXERCISE_PHASE.COOLDOWN) {
    const mainDone = isPhaseComplete(
      completedExercises,
      getPhaseExercises(enriched, EXERCISE_PHASE.MAIN),
      day,
      date
    )
    return warmupDone && mainDone
  }

  return false
}

/** First phase that still has unfinished exercises, or cooldown if all done. */
export function getCurrentWorkoutPhase(enriched, completedExercises, day, date = todayDateString()) {
  for (const phase of [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN]) {
    const phaseExercises = getPhaseExercises(enriched, phase)
    if (phaseExercises.length && !isPhaseComplete(completedExercises, phaseExercises, day, date)) {
      return phase
    }
  }
  return EXERCISE_PHASE.COOLDOWN
}

export function getMainExercisesForDay(state, day) {
  const schedule = state.workoutSchedule?.[day]
  const exercises = schedule?.exercises || []
  const customExercises = state.customExercises || []
  return exercises.filter((ex) => {
    const library = customExercises.find((c) => c.id === ex.exerciseId)
    return inferExercisePhase({ ...library, ...ex }) === EXERCISE_PHASE.MAIN
  })
}

/** All exercises for a day regardless of phase (warmup + main + cooldown). */
export function getAllExercisesForDay(state, day) {
  const schedule = state.workoutSchedule?.[day]
  return schedule?.exercises || []
}

export function countMainDayCompletions(completedExercises, mainExercises, day, date = todayDateString()) {
  return mainExercises.reduce((acc, ex) => {
    const entry = completedExercises?.[completionKey(date, day, ex.id)]
    return acc + (entry?.completedAt && !entry?.skipped ? 1 : 0)
  }, 0)
}

export function areAllMainExercisesCompleted(
  completedExercises,
  mainExercises,
  day,
  date = todayDateString()
) {
  if (!mainExercises?.length) return false
  return countMainDayCompletions(completedExercises, mainExercises, day, date) === mainExercises.length
}

/** Returns true when every exercise across all phases is completed or skipped. */
export function areAllExercisesCompleted(
  completedExercises,
  allExercises,
  day,
  date = todayDateString()
) {
  if (!allExercises?.length) return false
  return allExercises.every((ex) => {
    const entry = completedExercises?.[completionKey(date, day, ex.id)]
    return entry && (entry.completedAt || entry.skipped)
  })
}

export function startWorkoutSession(day, date = todayDateString()) {
  return { day, date, startedAt: Date.now() }
}

export function formatSessionDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function finishWorkoutSession(activeSession, state) {
  if (!activeSession) return null

  const { day, date, startedAt } = activeSession
  const allExercises = getAllExercisesForDay(state, day)
  const mainExercises = getMainExercisesForDay(state, day)
  const totalCount = allExercises.length
  const completedCount = allExercises.reduce((acc, ex) => {
    const entry = state.completedExercises?.[completionKey(date, day, ex.id)]
    return acc + (entry?.completedAt && !entry?.skipped ? 1 : 0)
  }, 0)
  // Keep mainCompleted for legacy stats compatibility
  const mainCompletedCount = countMainDayCompletions(state.completedExercises, mainExercises, day, date)

  const session = {
    id: String(Date.now()),
    day,
    date,
    startedAt,
    endedAt: Date.now(),
    completedCount,
    totalCount,
    mainCompletedCount,
  }

  return {
    completedSessions: [...(state.completedSessions || []), session],
    activeWorkoutSession: null,
  }
}

export function getTodaySessionForDay(completedSessions, day, date = todayDateString()) {
  return (completedSessions || []).find((s) => s.day === day && s.date === date)
}

/** Mark every scheduled exercise skipped and close out today's session. */
export function skipWorkoutForToday(state, day, reason, date = todayDateString()) {
  const schedule = state.workoutSchedule?.[day]
  const exercises = schedule?.exercises || []
  const mainExercises = getMainExercisesForDay(state, day)
  const now = Date.now()

  const completedExercises = { ...(state.completedExercises || {}) }
  for (const ex of exercises) {
    completedExercises[completionKey(date, day, ex.id)] = {
      date,
      day,
      exerciseId: ex.id,
      skipped: true,
      skipReason: reason,
      skippedAt: now,
      libraryExerciseId: ex.exerciseId,
    }
  }

  const session = {
    id: String(now),
    day,
    date,
    startedAt: now,
    endedAt: now,
    completedCount: 0,
    totalCount: mainExercises.length,
    skipped: true,
    skipReason: reason,
  }

  const completedSessions = (state.completedSessions || []).filter(
    (entry) => !(entry.day === day && entry.date === date)
  )

  const activeSession = state.activeWorkoutSession
  const clearActive =
    activeSession?.day === day && activeSession?.date === date ? null : activeSession

  return {
    completedExercises,
    completedSessions: [...completedSessions, session],
    activeWorkoutSession: clearActive,
  }
}
