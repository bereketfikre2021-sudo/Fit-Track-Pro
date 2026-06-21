import { completionKey } from './workoutSession'

function parseNum(val) {
  const n = parseFloat(String(val).replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

function setVolume(set) {
  return parseNum(set.weightKg) * parseNum(set.reps)
}

/**
 * Best set by weight (tie-breaker: reps), then max volume.
 */
export function scoreSet(set) {
  const weight = parseNum(set.weightKg)
  const reps = parseNum(set.reps)
  return { weight, reps, volume: weight * reps }
}

export function formatBestSet(set) {
  if (!set) return null
  const { weight, reps } = scoreSet(set)
  if (weight > 0 && reps > 0) return `${weight}kg × ${reps}`
  if (weight > 0) return `${weight}kg`
  if (reps > 0) return `${reps} reps`
  return null
}

function isBetterSet(candidate, current) {
  if (!current) return true
  const c = scoreSet(candidate)
  const b = scoreSet(current)
  if (c.weight > b.weight) return true
  if (c.weight === b.weight && c.reps > b.reps) return true
  if (c.weight === 0 && b.weight === 0 && c.volume > b.volume) return true
  return false
}

/** Collect all set logs for a library exercise id across history. */
export function collectSetsForLibraryExercise(completedExercises, libraryExerciseId, excludeKey = null) {
  const allSets = []

  Object.entries(completedExercises || {}).forEach(([key, entry]) => {
    if (excludeKey && key === excludeKey) return
    if (entry.libraryExerciseId !== libraryExerciseId) return
    ;(entry.sets || []).forEach((set) => {
      if (set.weightKg?.trim() || set.reps?.trim()) {
        allSets.push({ set, date: entry.date, key })
      }
    })
  })

  return allSets
}

export function getPersonalRecord(completedExercises, libraryExerciseId, excludeKey = null) {
  if (!libraryExerciseId) return null

  const logged = collectSetsForLibraryExercise(
    completedExercises,
    libraryExerciseId,
    excludeKey
  )

  let bestSet = null
  let bestDate = null

  logged.forEach(({ set, date }) => {
    if (isBetterSet(set, bestSet)) {
      bestSet = set
      bestDate = date
    }
  })

  return bestSet
    ? {
        bestSet,
        label: formatBestSet(bestSet),
        date: bestDate,
      }
    : null
}

export function getBestSetFromEntrySets(sets) {
  let best = null
  ;(sets || []).forEach((set) => {
    if (isBetterSet(set, best)) best = set
  })
  return best
}

export function isNewPersonalRecord(completedExercises, libraryExerciseId, sets, excludeKey = null) {
  if (!libraryExerciseId || !sets?.length) return false

  const previousBest = getPersonalRecord(completedExercises, libraryExerciseId, excludeKey)
  const todayBest = getBestSetFromEntrySets(sets)

  if (!todayBest || (!todayBest.weightKg?.trim() && !todayBest.reps?.trim())) return false
  if (!previousBest) return hasMeaningfulSet(todayBest)

  return isBetterSet(todayBest, previousBest.bestSet)
}

function hasMeaningfulSet(set) {
  return parseNum(set.weightKg) > 0 || parseNum(set.reps) > 0
}

export function getLastSessionSummary(completedExercises, libraryExerciseId) {
  if (!libraryExerciseId) return null

  const entries = Object.values(completedExercises || {})
    .filter((e) => e.libraryExerciseId === libraryExerciseId && e.sets?.length)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))

  const last = entries[0]
  if (!last) return null

  const summary = formatBestSet(getBestSetFromEntrySets(last.sets))
  return summary ? { date: last.date, summary } : null
}
