import { getWeeklyWorkoutReport } from './workoutInsights'

/** Exercises marked complete during the current calendar week (Mon–Sun). */
export function getWeeklyCompletedExerciseCount(state) {
  return getWeeklyWorkoutReport(state).exercisesCompletedCount
}

/** Unique calendar days with at least one completed exercise (all time). */
export function getTotalWorkoutDaysCompleted(state) {
  const completed = state?.completedExercises || {}
  const dates = new Set()
  Object.values(completed).forEach((entry) => {
    if (entry?.date) dates.add(entry.date)
  })
  return dates.size
}
