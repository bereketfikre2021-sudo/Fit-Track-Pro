/**
 * Progressive Overload tracking utilities.
 *
 * Progressive overload = consistently increasing the demand on the
 * musculoskeletal system over time (more weight, reps, or sets).
 *
 * Key metrics per exercise per session:
 *   - Best set: the single set with the highest estimated 1RM
 *   - Total volume: sum of (weightKg × reps) across all sets
 *   - Estimated 1RM: Epley formula → weight × (1 + reps / 30)
 *
 * Trend is derived by comparing the last two sessions.
 */

/**
 * Epley 1-rep-max estimate.
 * Returns 0 if weight or reps is missing / zero.
 */
export function estimate1RM(weightKg, reps) {
  const w = parseFloat(weightKg)
  const r = parseInt(reps, 10)
  if (!w || !r || w <= 0 || r <= 0) return 0
  if (r === 1) return w
  return Math.round(w * (1 + r / 30) * 10) / 10
}

/**
 * Total volume for a set array (sum of weight × reps).
 */
export function calcVolume(sets) {
  return (sets || []).reduce((acc, s) => {
    const w = parseFloat(s.weightKg)
    const r = parseInt(s.reps, 10)
    if (w > 0 && r > 0) acc += w * r
    return acc
  }, 0)
}

/**
 * Best set in an array: the one with the highest estimated 1RM.
 * Returns null if no weighted sets.
 */
export function getBestSet(sets) {
  let best = null
  let bestE1rm = 0
  for (const s of sets || []) {
    const e = estimate1RM(s.weightKg, s.reps)
    if (e > bestE1rm) {
      bestE1rm = e
      best = s
    }
  }
  return best
}

/**
 * Summarise a set of logged sets into a display-friendly snapshot.
 */
function summariseSets(sets, date) {
  const logged = (sets || []).filter((s) => {
    const w = parseFloat(s.weightKg)
    const r = parseInt(s.reps, 10)
    return (w > 0 || r > 0)
  })
  if (logged.length === 0) return null

  const best = getBestSet(logged)
  const volume = Math.round(calcVolume(logged))
  const e1rm = best ? estimate1RM(best.weightKg, best.reps) : 0

  // Human-readable set list, e.g. "60kg×10 · 65kg×8"
  const setsLabel = logged
    .map((s) => {
      const w = parseFloat(s.weightKg)
      const r = parseInt(s.reps, 10)
      if (w > 0 && r > 0) return `${w}kg×${r}`
      if (w > 0) return `${w}kg`
      if (r > 0) return `×${r}`
      return null
    })
    .filter(Boolean)
    .join(' · ')

  return {
    date,
    sets: logged,
    setsLabel,
    bestWeightKg: best ? parseFloat(best.weightKg) : 0,
    bestReps: best ? parseInt(best.reps, 10) : 0,
    volume,
    e1rm,
  }
}

/**
 * Get all logged sessions for a specific library exercise (by libraryExerciseId),
 * sorted oldest → newest.
 */
function getSessionsForExercise(completedExercises, libraryExerciseId) {
  const sessions = []

  Object.values(completedExercises || {}).forEach((entry) => {
    if (!entry?.completedAt || entry.skipped) return
    // Match by libraryExerciseId (preferred) or exerciseId fallback
    const matches =
      entry.libraryExerciseId === libraryExerciseId ||
      entry.exerciseId === libraryExerciseId
    if (!matches) return

    const snap = summariseSets(entry.sets, entry.date)
    if (!snap) return // no weight/reps data logged at all
    sessions.push({ ...snap, completedAt: entry.completedAt })
  })

  return sessions.sort((a, b) => a.completedAt - b.completedAt)
}

/**
 * Trend direction comparing two sessions.
 * 'up' | 'same' | 'down' | null (not enough data)
 */
function getTrend(prev, curr) {
  if (!prev || !curr) return null
  if (curr.e1rm > prev.e1rm + 0.5) return 'up'
  if (curr.e1rm < prev.e1rm - 0.5) return 'down'
  return 'same'
}

/**
 * Build the progressive overload data for every main exercise in the
 * user's workout schedule.
 *
 * Returns an array of exercise rows, each with:
 *   - name, libraryExerciseId
 *   - sessions: last N snapshots (oldest → newest)
 *   - trend: 'up' | 'same' | 'down' | null
 *   - lastSession, prevSession snapshots
 */
export function getProgressiveOverloadData(state, { maxSessions = 5 } = {}) {
  const completedExercises = state.completedExercises || {}
  const customExercises = state.customExercises || []
  const workoutSchedule = state.workoutSchedule || {}
  const workoutDays = state.profile?.workoutDays || []

  // Collect all unique scheduled main exercises
  const seen = new Set()
  const exerciseRows = []

  workoutDays.forEach((day) => {
    const dayExercises = workoutSchedule[day]?.exercises || []
    dayExercises.forEach((scheduled) => {
      // Prefer the library ID; fall back to the schedule entry's own ID.
      // Always use the library ID as the canonical lookup key so that
      // getSessionsForExercise (which matches entry.libraryExerciseId) finds the right history.
      const libraryId = scheduled.exerciseId
      const fallbackId = scheduled.id
      const canonicalId = libraryId || fallbackId
      if (!canonicalId || seen.has(canonicalId)) return
      seen.add(canonicalId)

      const library = customExercises.find((ex) => ex.id === canonicalId)
      // Skip time-based (hold) exercises — progressive overload is weight/rep focused
      if (library?.isTimeBased || scheduled.isTimeBased) return

      // Only match history by libraryExerciseId when we have a real library ID,
      // otherwise fall back to the schedule entry ID — keeps the two lookup paths separate.
      const sessions = getSessionsForExercise(completedExercises, canonicalId)
      if (sessions.length === 0) return // no logged data yet

      const recentSessions = sessions.slice(-maxSessions)
      const lastSession = recentSessions[recentSessions.length - 1] ?? null
      const prevSession = recentSessions.length >= 2
        ? recentSessions[recentSessions.length - 2]
        : null

      exerciseRows.push({
        id: canonicalId,
        name: library?.name || scheduled.name || 'Exercise',
        muscleGroups: library?.muscleGroups || scheduled.muscleGroups || [],
        sessions: recentSessions,
        lastSession,
        prevSession,
        trend: getTrend(prevSession, lastSession),
      })
    })
  })

  // Sort: exercises with more sessions first (most tracked), then by name
  return exerciseRows.sort((a, b) => {
    if (b.sessions.length !== a.sessions.length) return b.sessions.length - a.sessions.length
    return a.name.localeCompare(b.name)
  })
}
