/**
 * Custom user-defined challenges / goals.
 * Stored in state.customChallenges: Challenge[]
 *
 * Challenge shape:
 * {
 *   id: string,
 *   title: string,
 *   type: 'sessions' | 'exercises' | 'weight' | 'streak' | 'water',
 *   target: number,         // e.g. 20 sessions, 100kg, 30 days
 *   period: 'allTime' | 'monthly',
 *   createdAt: number,
 *   completedAt: number | null,
 * }
 */

import { getWorkoutStreaks } from './streaks'

export const CHALLENGE_TYPES = [
  { value: 'sessions',   label: 'Complete sessions',   unit: 'sessions' },
  { value: 'exercises',  label: 'Complete exercises',   unit: 'exercises' },
  { value: 'streak',     label: 'Workout streak',       unit: 'days' },
  { value: 'weight',     label: 'Lift weight (kg)',     unit: 'kg' },
  { value: 'water',      label: 'Hit water goal',       unit: 'days' },
]

export const CHALLENGE_PERIODS = [
  { value: 'allTime', label: 'All time' },
  { value: 'monthly', label: 'This month' },
]

function getMonthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

function countCompletedExercisesInPeriod(completedExercises, period) {
  const cutoff = period === 'monthly' ? getMonthStart() : 0
  return Object.values(completedExercises || {}).filter(
    (e) => e?.completedAt && !e?.skipped && e.completedAt >= cutoff
  ).length
}

function countCompletedSessionsInPeriod(completedSessions, period) {
  const cutoff = period === 'monthly' ? getMonthStart() : 0
  return (completedSessions || []).filter(
    (s) => s?.endedAt && !s?.skipped && s.endedAt >= cutoff
  ).length
}

function countWaterGoalDaysInPeriod(waterLogs, waterGoalCups, period) {
  const goal = Number(waterGoalCups) || 8
  const cutoff = period === 'monthly' ? new Date(getMonthStart()).toISOString().slice(0, 10) : ''
  return Object.entries(waterLogs || {}).filter(([date, cups]) => {
    if (period === 'monthly' && date < cutoff) return false
    return Number(cups) >= goal
  }).length
}

function getBestWeightLifted(completedExercises, period) {
  const cutoff = period === 'monthly' ? getMonthStart() : 0
  let best = 0
  Object.values(completedExercises || {}).forEach((entry) => {
    if (!entry?.completedAt || entry.skipped || entry.completedAt < cutoff) return
    ;(entry.sets || []).forEach((s) => {
      const w = parseFloat(s.weightKg)
      if (!isNaN(w) && w > best) best = w
    })
  })
  return best
}

export function evaluateChallenge(challenge, state) {
  const { type, target, period } = challenge
  const completedExercises = state.completedExercises || {}
  const completedSessions = state.completedSessions || []
  const waterLogs = state.waterLogs || {}
  const waterGoalCups = state.appSettings?.waterGoalCups || 8
  const streaks = getWorkoutStreaks(completedExercises)

  let current = 0
  switch (type) {
    case 'sessions':
      current = countCompletedSessionsInPeriod(completedSessions, period)
      break
    case 'exercises':
      current = countCompletedExercisesInPeriod(completedExercises, period)
      break
    case 'streak':
      current = Math.max(streaks.current, streaks.longest)
      break
    case 'weight':
      current = getBestWeightLifted(completedExercises, period)
      break
    case 'water':
      current = countWaterGoalDaysInPeriod(waterLogs, waterGoalCups, period)
      break
    default:
      current = 0
  }

  const progress = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
  const completed = current >= target

  return { current, progress, completed }
}
