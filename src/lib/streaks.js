import { todayDateString } from './workoutSession'

function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(dateStr, delta) {
  const d = parseDateString(dateStr)
  d.setDate(d.getDate() + delta)
  return toDateString(d)
}

function daysBetween(a, b) {
  const ms = parseDateString(b) - parseDateString(a)
  return Math.round(ms / 86400000)
}

/** Unique YYYY-MM-DD dates with at least one completed (non-skipped) exercise. */
export function getActiveWorkoutDates(completedExercises) {
  const dates = new Set()
  Object.values(completedExercises || {}).forEach((entry) => {
    if (entry?.date && !entry.skipped) dates.add(entry.date)
  })
  return [...dates].sort()
}

/**
 * Consecutive calendar days with activity ending today (or yesterday if none today).
 */
export function getCurrentStreak(completedExercises, referenceDate = todayDateString()) {
  const active = new Set(getActiveWorkoutDates(completedExercises))
  if (active.size === 0) return 0

  let cursor = referenceDate
  if (!active.has(cursor)) {
    cursor = addDays(cursor, -1)
  }
  if (!active.has(cursor)) return 0

  let streak = 0
  while (active.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive calendar days with activity. */
export function getLongestStreak(completedExercises) {
  const sorted = getActiveWorkoutDates(completedExercises)
  if (sorted.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < sorted.length; i += 1) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }

  return longest
}

export function getWorkoutStreaks(completedExercises, referenceDate = todayDateString()) {
  return {
    current: getCurrentStreak(completedExercises, referenceDate),
    longest: getLongestStreak(completedExercises),
    activeDays: getActiveWorkoutDates(completedExercises).length,
  }
}
