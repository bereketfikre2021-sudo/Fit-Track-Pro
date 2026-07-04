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
