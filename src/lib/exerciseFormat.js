/** @param {'seconds' | 'minutes'} durationUnit */
export function buildExerciseTarget({
  isTimeBased,
  sets,
  reps,
  duration,
  durationUnit = 'seconds',
}) {
  if (isTimeBased) {
    const unitLabel = durationUnit === 'minutes' ? ' min' : 's'
    const durationPart = `${duration}${unitLabel}`
    const setsNum = parseInt(String(sets ?? '0'), 10)
    const repsTrimmed = reps?.toString().trim()
    const repsNum = parseInt(repsTrimmed || '0', 10)

    if (setsNum <= 0 && repsNum <= 0) {
      return durationPart
    }
    if (repsTrimmed && repsNum > 0) {
      const setCount = setsNum > 0 ? setsNum : 1
      return `${setCount} sets × ${repsTrimmed} reps × ${durationPart}`
    }
    if (setsNum > 0) {
      return `${setsNum} sets × ${durationPart}`
    }
    return durationPart
  }
  return `${sets}×${reps}`
}

/** Default empty hold sets/reps to 0. */
export function normalizeHoldFields(exercise) {
  if (!exercise?.isTimeBased) return exercise
  const setsRaw = exercise.sets?.toString().trim()
  const repsRaw = exercise.reps?.toString().trim()
  return {
    ...exercise,
    sets: setsRaw === '' || setsRaw == null ? '0' : setsRaw,
    reps: repsRaw === '' || repsRaw == null ? '0' : repsRaw,
  }
}

export function formatExerciseTarget(exercise) {
  const isTimeBased = exercise?.isTimeBased ?? false
  if (exercise?.target && !isTimeBased) return exercise.target
  return buildExerciseTarget({
    isTimeBased,
    sets: exercise?.sets ?? (isTimeBased ? '0' : '3'),
    reps: exercise?.reps ?? (isTimeBased ? '0' : '10'),
    duration: exercise?.duration ?? '30',
    durationUnit: exercise?.durationUnit ?? 'seconds',
  })
}

export function getDurationLabel(durationUnit) {
  return durationUnit === 'minutes' ? 'Duration (min)' : 'Duration (sec)'
}

export function getHoldTimeLabel(durationUnit) {
  return getDurationLabel(durationUnit)
}

export function isHoldExercise(exercise) {
  return !!exercise?.isTimeBased
}
