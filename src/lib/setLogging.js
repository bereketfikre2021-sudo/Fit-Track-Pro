import { inferExercisePhase, isSimplePhase } from './exercisePhase'

/** @typedef {{ setNumber: number, reps: string, weightKg: string }} WorkoutSet */

export function parseSetCount(exercise) {
  const n = parseInt(String(exercise?.sets ?? '3'), 10)
  return Number.isNaN(n) || n < 1 ? 3 : Math.min(n, 20)
}

export function buildDefaultSets(exercise, libraryExercise = null) {
  const merged = { ...libraryExercise, ...exercise }
  if (isSimplePhase(inferExercisePhase(merged)) || merged.isTimeBased) {
    return []
  }

  const count = parseSetCount(merged)
  const defaultReps = String(merged.reps ?? '10').trim()
  const defaultWeightKg = merged.weightKg ? String(merged.weightKg) : ''

  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: defaultReps,
    weightKg: defaultWeightKg,
  }))
}

/**
 * Like buildDefaultSets but seeds reps/weightKg from the most recent
 * logged session for this exercise, falling back to the exercise defaults.
 * Used to pre-fill the set editor on the workout card.
 */
export function buildSeededSets(exercise, libraryExercise = null, completedExercises = {}) {
  const merged = { ...libraryExercise, ...exercise }
  if (isSimplePhase(inferExercisePhase(merged)) || merged.isTimeBased) {
    return []
  }

  const count = parseSetCount(merged)
  const libraryId = libraryExercise?.id || exercise?.exerciseId

  // Find the most recent completed entry for this exercise (by libraryExerciseId)
  let lastSets = null
  if (libraryId) {
    const entries = Object.values(completedExercises)
      .filter((e) => e?.libraryExerciseId === libraryId && e.completedAt && !e.skipped && e.sets?.length)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    if (entries[0]?.sets?.length) {
      lastSets = entries[0].sets
    }
  }

  if (lastSets) {
    // Use last session's sets, adjusting count if needed
    const base = lastSets.slice(0, count)
    // If we need more sets, repeat the last one
    const lastSet = base[base.length - 1]
    while (base.length < count) {
      base.push({ ...lastSet, setNumber: base.length + 1 })
    }
    return base.map((s, i) => ({
      setNumber: i + 1,
      reps: s.reps != null ? String(s.reps) : '',
      weightKg: s.weightKg != null ? String(s.weightKg) : '',
    }))
  }

  // No history — fall back to exercise defaults
  const defaultReps = String(merged.reps ?? '10').trim()
  const defaultWeightKg = merged.weightKg ? String(merged.weightKg) : ''
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: defaultReps,
    weightKg: defaultWeightKg,
  }))
}

export function normalizeSets(sets, exercise, libraryExercise) {
  if (!sets?.length) return buildDefaultSets(exercise, libraryExercise)

  return sets.map((s, i) => ({
    setNumber: s.setNumber ?? i + 1,
    reps: s.reps != null ? String(s.reps) : '',
    weightKg: s.weightKg != null ? String(s.weightKg) : '',
  }))
}

/** Migrate legacy single weightUsed into sets array. */
export function migrateCompletionEntry(entry, exercise, libraryExercise) {
  if (!entry) return null

  let sets = entry.sets
  if (!sets?.length && entry.weightUsed) {
    const base = buildDefaultSets(exercise, libraryExercise)
    if (base.length > 0) {
      base[0] = { ...base[0], weightKg: String(entry.weightUsed) }
      sets = base
    }
  }

  return {
    ...entry,
    sets: normalizeSets(sets, exercise, libraryExercise),
    libraryExerciseId: entry.libraryExerciseId || libraryExercise?.id || exercise?.exerciseId,
  }
}

export function addSetRow(sets) {
  const nextNumber = sets.length > 0 ? Math.max(...sets.map((s) => s.setNumber)) + 1 : 1
  return [...sets, { setNumber: nextNumber, reps: '', weightKg: '' }]
}

export function updateSetRow(sets, setNumber, field, value) {
  return sets.map((s) =>
    s.setNumber === setNumber ? { ...s, [field]: value } : s
  )
}

export function removeSetRow(sets, setNumber) {
  const filtered = sets.filter((s) => s.setNumber !== setNumber)
  return filtered.map((s, i) => ({ ...s, setNumber: i + 1 }))
}

export function formatSetsSummary(sets) {
  const logged = (sets || []).filter((s) => s.reps || s.weightKg)
  if (logged.length === 0) return null
  return logged
    .map((s) => {
      const w = s.weightKg ? `${s.weightKg}kg` : ''
      const r = s.reps ? `×${s.reps}` : ''
      return `${w}${r}`.trim() || `Set ${s.setNumber}`
    })
    .join(' · ')
}

export function hasLoggedSets(sets) {
  return (sets || []).some((s) => s.reps?.trim() || s.weightKg?.trim())
}
