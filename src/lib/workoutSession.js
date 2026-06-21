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

export function getMainExercisesForDay(state, day) {
  const schedule = state.workoutSchedule?.[day]
  const exercises = schedule?.exercises || []
  const customExercises = state.customExercises || []
  return exercises.filter((ex) => {
    const library = customExercises.find((c) => c.id === ex.exerciseId)
    return inferExercisePhase({ ...library, ...ex }) === EXERCISE_PHASE.MAIN
  })
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
  const mainExercises = getMainExercisesForDay(state, day)
  const totalCount = mainExercises.length
  const completedCount = countMainDayCompletions(state.completedExercises, mainExercises, day, date)

  const session = {
    id: String(Date.now()),
    day,
    date,
    startedAt,
    endedAt: Date.now(),
    completedCount,
    totalCount,
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
