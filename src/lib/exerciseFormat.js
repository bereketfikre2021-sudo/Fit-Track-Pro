import { formatSimplePhaseTarget, isSimplePhase } from './exercisePhase'

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
    const repsTrimmed = reps?.toString().trim()
    if (repsTrimmed) {
      return `${sets} sets × ${repsTrimmed} reps × ${durationPart}`
    }
    return `${sets} sets × ${durationPart}`
  }
  return `${sets}×${reps}`
}

export function formatExerciseTarget(exercise) {
  if (isSimplePhase(exercise?.exercisePhase)) {
    return formatSimplePhaseTarget(exercise)
  }
  if (exercise?.target) return exercise.target
  return buildExerciseTarget(exercise)
}

export function getDurationLabel(durationUnit) {
  return durationUnit === 'minutes' ? 'Duration (min)' : 'Duration (sec)'
}

export function isHoldExercise(exercise) {
  return !!exercise?.isTimeBased
}
