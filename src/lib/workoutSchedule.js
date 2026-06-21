import { buildExerciseTarget } from './exerciseFormat'

export function addExerciseToDay(workoutSchedule, day, customExercises, exerciseId, details) {
  const exercise = customExercises.find((ex) => ex.id === exerciseId)
  if (!exercise) return null

  const isTimeBased = details.isTimeBased ?? exercise.isTimeBased ?? false
  const sets = details.sets ?? exercise.sets ?? '3'
  const reps = details.reps ?? exercise.reps ?? ''
  const duration = details.duration ?? exercise.duration ?? '30'
  const durationUnit = details.durationUnit ?? exercise.durationUnit ?? 'seconds'

  const daySchedule = workoutSchedule[day] || { note: '', exercises: [] }

  const entry = {
    id: `${exercise.id}-${Date.now()}`,
    exerciseId: exercise.id,
    name: exercise.name,
    exercisePhase: exercise.exercisePhase || 'main',
    sets,
    isTimeBased,
    restTime: exercise.restTime,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    muscleGroups: exercise.muscleGroups,
    target: buildExerciseTarget({ isTimeBased, sets, reps, duration, durationUnit }),
  }

  if (isTimeBased) {
    entry.duration = duration
    entry.durationUnit = durationUnit
    if (reps?.toString().trim()) {
      entry.reps = reps
    }
  } else {
    entry.reps = reps
  }

  return {
    ...workoutSchedule,
    [day]: {
      ...daySchedule,
      exercises: [...daySchedule.exercises, entry],
    },
  }
}

export function removeExerciseFromDay(workoutSchedule, day, scheduleExerciseId) {
  const daySchedule = workoutSchedule[day]
  if (!daySchedule) return null

  return {
    ...workoutSchedule,
    [day]: {
      ...daySchedule,
      exercises: daySchedule.exercises.filter((ex) => ex.id !== scheduleExerciseId),
    },
  }
}

function cloneScheduleExercise(ex) {
  return {
    ...ex,
    id: `${ex.exerciseId || 'ex'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }
}

/** Copy all exercises from one day to other days. */
export function copyDaySchedule(workoutSchedule, fromDay, toDays, { replace = false } = {}) {
  const source = workoutSchedule[fromDay]?.exercises || []
  if (!source.length) return null

  const newSchedule = { ...workoutSchedule }

  toDays.forEach((day) => {
    if (day === fromDay) return
    const daySchedule = newSchedule[day] || { note: `${day} workout`, exercises: [] }
    const cloned = source.map(cloneScheduleExercise)
    newSchedule[day] = {
      ...daySchedule,
      exercises: replace ? cloned : [...daySchedule.exercises, ...cloned],
    }
  })

  return newSchedule
}

/** Reorder exercises within a single day. */
export function reorderDayExercises(workoutSchedule, day, fromIndex, toIndex) {
  const daySchedule = workoutSchedule[day]
  if (!daySchedule?.exercises) return null

  const exercises = [...daySchedule.exercises]
  if (fromIndex < 0 || fromIndex >= exercises.length) return null
  if (toIndex < 0 || toIndex >= exercises.length) return null

  const [moved] = exercises.splice(fromIndex, 1)
  exercises.splice(toIndex, 0, moved)

  return {
    ...workoutSchedule,
    [day]: { ...daySchedule, exercises },
  }
}
