import i18n from '@/i18n'

export const EXERCISE_PHASE = {
  MAIN: 'main',
  WARMUP: 'warmup',
  COOLDOWN: 'cooldown',
}

export const EXERCISE_PHASE_OPTIONS = [
  {
    value: EXERCISE_PHASE.MAIN,
    label: 'Main workout',
    shortLabel: 'Main',
    description: 'Primary lifts and workout exercises',
  },
  {
    value: EXERCISE_PHASE.WARMUP,
    label: 'Warm-up',
    shortLabel: 'Warm-up',
    description: 'Mobility, activation, and light prep before training',
  },
  {
    value: EXERCISE_PHASE.COOLDOWN,
    label: 'Cool-down',
    shortLabel: 'Cool-down',
    description: 'Stretching and recovery after your session',
  },
]

const PHASE_ORDER = [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN]

export function normalizeExercisePhase(phase) {
  if (phase === EXERCISE_PHASE.WARMUP || phase === EXERCISE_PHASE.COOLDOWN) {
    return phase
  }
  return EXERCISE_PHASE.MAIN
}

/** Resolve phase from stored fields (handles older saves). */
export function inferExercisePhase(exercise) {
  if (exercise?.category === 'Warm-up') return EXERCISE_PHASE.WARMUP
  if (exercise?.category === 'Cool-down') return EXERCISE_PHASE.COOLDOWN
  if (exercise?.exercisePhase === EXERCISE_PHASE.WARMUP) return EXERCISE_PHASE.WARMUP
  if (exercise?.exercisePhase === EXERCISE_PHASE.COOLDOWN) return EXERCISE_PHASE.COOLDOWN
  return EXERCISE_PHASE.MAIN
}

export function getExercisePhaseLabel(phase) {
  const p = normalizeExercisePhase(phase)
  return i18n.t(`exercisePhase.${p}.short`, { defaultValue: 'Main' })
}

export function getExercisePhaseLongLabel(phase) {
  const p = normalizeExercisePhase(phase)
  return i18n.t(`exercisePhase.${p}.label`)
}

export function getExercisePhaseDescription(phase) {
  const p = normalizeExercisePhase(phase)
  return i18n.t(`exercisePhase.${p}.description`)
}

export function getExercisePhaseBadgeClass(phase) {
  switch (normalizeExercisePhase(phase)) {
    case EXERCISE_PHASE.WARMUP:
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case EXERCISE_PHASE.COOLDOWN:
      return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
    default:
      return 'bg-primary/10 text-primary border-primary/20'
  }
}

export function groupExercisesByPhase(exercises) {
  const groups = {
    [EXERCISE_PHASE.WARMUP]: [],
    [EXERCISE_PHASE.MAIN]: [],
    [EXERCISE_PHASE.COOLDOWN]: [],
  }

  exercises.forEach((ex) => {
    groups[inferExercisePhase(ex)].push(ex)
  })

  return PHASE_ORDER.map((phase) => ({
    phase,
    label: getExercisePhaseLabel(phase),
    exercises: groups[phase],
  })).filter((g) => g.exercises.length > 0)
}

export function filterExercisesByPhase(exercises, phaseFilter) {
  return exercises.filter((ex) => inferExercisePhase(ex) === phaseFilter)
}

export function isSimplePhase(phase) {
  const p = normalizeExercisePhase(phase)
  return p === EXERCISE_PHASE.WARMUP || p === EXERCISE_PHASE.COOLDOWN
}

export function isSimpleExercise(exercise) {
  return isSimplePhase(inferExercisePhase(exercise))
}

export function formatSimplePhaseTarget(exercise) {
  if (exercise?.target) return exercise.target
  const isTimeBased = exercise?.isTimeBased ?? false
  const sets = exercise?.sets ?? '3'
  const reps = exercise?.reps ?? '10'
  const duration = exercise?.duration ?? '30'
  const durationUnit = exercise?.durationUnit ?? 'seconds'
  if (isTimeBased) {
    const unitLabel = durationUnit === 'minutes' ? ' min' : 's'
    const durationPart = `${duration}${unitLabel}`
    const repsTrimmed = reps?.toString().trim()
    if (repsTrimmed) {
      return `${sets} sets × ${repsTrimmed} reps × ${durationPart}`
    }
    return `${sets} sets × ${durationPart}`
  }
  return `${sets}×${reps}`
}

export function buildSimplePhaseDefaults(phase) {
  const normalized = normalizeExercisePhase(phase)
  return {
    name: '',
    description: '',
    exercisePhase: normalized,
    sets: '3',
    reps: '10',
    isTimeBased: false,
    duration: '',
    durationUnit: 'seconds',
    restTime: '',
    muscleGroups: [],
    equipment: '',
    difficulty: 'Beginner',
    category: normalized === EXERCISE_PHASE.WARMUP ? 'Warm-up' : 'Cool-down',
    imageUrl: '',
    instructions: '',
    tips: '',
    target: '3 × 10',
  }
}
export function packSimplePhaseExercise(
  existing,
  { name, duration, durationUnit, notes, exercisePhase, sets, reps, isTimeBased, restTime }
) {
  const phase = normalizeExercisePhase(
    exercisePhase ?? inferExercisePhase(existing ?? {})
  )
  const resolvedIsTimeBased = isTimeBased !== undefined ? isTimeBased : true
  const d = String(duration || '5')
  const unit = durationUnit === 'seconds' ? 'seconds' : 'minutes'
  const target = formatSimplePhaseTarget({
    isTimeBased: resolvedIsTimeBased,
    sets: sets || '1',
    reps: reps || '10',
    duration: d,
    durationUnit: unit,
  })
  return {
    ...(existing || buildSimplePhaseDefaults(phase)),
    name: name.trim(),
    exercisePhase: phase,
    description: notes?.trim() || '',
    sets: sets || '1',
    reps: resolvedIsTimeBased ? (reps || '') : (reps || '10'),
    isTimeBased: resolvedIsTimeBased,
    duration: d,
    durationUnit: unit,
    restTime: restTime || '',
    muscleGroups: [],
    equipment: '',
    imageUrl: '',
    instructions: '',
    tips: '',
    target,
  }
}
