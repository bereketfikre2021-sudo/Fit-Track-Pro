import { buildExerciseTarget } from './exerciseFormat'

export function addExerciseToDay(workoutSchedule, day, customExercises, exerciseId, details) {
  const exercise = customExercises.find((ex) => ex.id === exerciseId)
  if (!exercise) return null

  const isTimeBased = details.isTimeBased ?? exercise.isTimeBased ?? false
  const sets = details.sets ?? exercise.sets ?? '3'
  const reps = details.reps ?? exercise.reps ?? ''
  const duration = details.duration ?? exercise.duration ?? '30'
  const durationUnit = details.durationUnit ?? exercise.durationUnit ?? 'seconds'
  const weightKg = details.weightKg ?? ''

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

  if (weightKg) entry.weightKg = weightKg

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

// ─── Workout Template utilities ───────────────────────────────────────────────

/** Add an exercise from the library into a template's exercises list. */
export function addExerciseToTemplate(template, customExercises, exerciseId, details) {
  const exercise = customExercises.find((ex) => ex.id === exerciseId)
  if (!exercise) return null

  const isTimeBased = details.isTimeBased ?? exercise.isTimeBased ?? false
  const sets = details.sets ?? exercise.sets ?? '3'
  const reps = details.reps ?? exercise.reps ?? ''
  const duration = details.duration ?? exercise.duration ?? '30'
  const durationUnit = details.durationUnit ?? exercise.durationUnit ?? 'seconds'
  const weightKg = details.weightKg ?? ''

  const entry = {
    id: `tpl-${exercise.id}-${Date.now()}`,
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

  if (weightKg) entry.weightKg = weightKg

  if (isTimeBased) {
    entry.duration = duration
    entry.durationUnit = durationUnit
    if (reps?.toString().trim()) entry.reps = reps
  } else {
    entry.reps = reps
  }

  return { ...template, exercises: [...(template.exercises || []), entry] }
}

/** Remove an exercise entry from a template. */
export function removeExerciseFromTemplate(template, entryId) {
  return {
    ...template,
    exercises: (template.exercises || []).filter((ex) => ex.id !== entryId),
  }
}

/** Reorder exercises within a template. */
export function reorderTemplateExercises(template, fromIndex, toIndex) {
  const exercises = [...(template.exercises || [])]
  if (fromIndex < 0 || fromIndex >= exercises.length) return template
  if (toIndex < 0 || toIndex >= exercises.length) return template
  const [moved] = exercises.splice(fromIndex, 1)
  exercises.splice(toIndex, 0, moved)
  return { ...template, exercises }
}

/**
 * Load a template into a scheduled day.
 * Each entry gets a fresh ID to avoid collisions with other days/sessions.
 * @param {'replace'|'append'} mode
 */
export function loadTemplateIntoDay(workoutSchedule, day, template, mode = 'append') {
  const daySchedule = workoutSchedule[day] || { note: '', exercises: [] }
  const cloned = (template.exercises || []).map((ex) => ({
    ...ex,
    id: `${ex.exerciseId || 'ex'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }))

  return {
    ...workoutSchedule,
    [day]: {
      ...daySchedule,
      exercises: mode === 'replace' ? cloned : [...daySchedule.exercises, ...cloned],
    },
  }
}
