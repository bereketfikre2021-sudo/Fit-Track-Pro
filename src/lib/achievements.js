import i18n from '@/i18n'
import { getWorkoutStreaks } from './streaks'

export const ACHIEVEMENT_IDS = [
  // First steps
  'first_completion',
  'first_session',
  // Streaks
  'streak_3',
  'streak_7',
  'streak_30',
  // Sessions
  'sessions_10',
  'sessions_50',
  'sessions_100',
  // Volume
  'exercises_50',
  'exercises_100',
  // Consistency
  'full_week',
  'weight_logged_7',
  // Goal
  'target_weight_reached',
  // Hydration
  'water_goal_7',
]

function countCompletedExercises(completedExercises) {
  return Object.values(completedExercises || {}).filter(
    (e) => e?.completedAt && !e?.skipped
  ).length
}

/** True if the user completed every scheduled workout day in any calendar week. */
function hasCompletedFullWeek(state) {
  const workoutDays = state.profile?.workoutDays || []
  if (workoutDays.length === 0) return false

  const completedSessions = state.completedSessions || []
  // Group sessions by ISO week (Mon-Sun)
  const weekMap = {}
  completedSessions.forEach((s) => {
    if (s.skipped || !s.date) return
    const [y, m, d] = s.date.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const day = date.getDay()
    const offset = day === 0 ? -6 : 1 - day
    const monday = new Date(date)
    monday.setDate(date.getDate() + offset)
    const key = monday.toISOString().slice(0, 10)
    if (!weekMap[key]) weekMap[key] = new Set()
    weekMap[key].add(s.day)
  })

  return Object.values(weekMap).some((daysSet) =>
    workoutDays.every((d) => daysSet.has(d))
  )
}

/** True if the user has logged body weight on at least 7 distinct dates. */
function hasLoggedWeightSevenDays(state) {
  const logs = state.bodyLogs || []
  const dates = new Set(logs.map((l) => l.date).filter(Boolean))
  return dates.size >= 7
}

/** True if current weight is at or below target weight (for loss goal) or at/above (for gain). */
function hasReachedTargetWeight(state) {
  const profile = state.profile || {}
  const current = parseFloat(profile.currentWeight)
  const target = parseFloat(profile.targetWeight)
  if (isNaN(current) || isNaN(target) || target <= 0) return false

  const goal = profile.goal
  if (goal === 'fat') return current <= target + 0.5
  if (goal === 'muscle') return current >= target - 0.5
  // For maintain/strength/endurance: within 2 kg of target
  return Math.abs(current - target) <= 2
}

/** True if the user hit their water goal on at least 7 distinct days. */
function hasHitWaterGoalSevenDays(state) {
  const waterLogs = state.waterLogs || {}
  const appSettings = state.appSettings || {}
  const goal = Number(appSettings.waterGoalCups) || 8
  const hitDays = Object.values(waterLogs).filter((cups) => Number(cups) >= goal)
  return hitDays.length >= 7
}

function evaluateAchievement(id, state) {
  const completedExercises = state.completedExercises || {}
  const completedSessions = state.completedSessions || []
  const streaks = getWorkoutStreaks(completedExercises)
  const exerciseCount = countCompletedExercises(completedExercises)

  switch (id) {
    case 'first_completion':  return exerciseCount >= 1
    case 'first_session':     return completedSessions.length >= 1
    case 'streak_3':          return streaks.longest >= 3
    case 'streak_7':          return streaks.longest >= 7
    case 'streak_30':         return streaks.longest >= 30
    case 'sessions_10':       return completedSessions.length >= 10
    case 'sessions_50':       return completedSessions.length >= 50
    case 'sessions_100':      return completedSessions.length >= 100
    case 'exercises_50':      return exerciseCount >= 50
    case 'exercises_100':     return exerciseCount >= 100
    case 'full_week':         return hasCompletedFullWeek(state)
    case 'weight_logged_7':   return hasLoggedWeightSevenDays(state)
    case 'target_weight_reached': return hasReachedTargetWeight(state)
    case 'water_goal_7':          return hasHitWaterGoalSevenDays(state)
    default:                  return false
  }
}

/** @returns {{ id, title, description, unlocked: boolean }[]} */
export function getAchievements(state) {
  return ACHIEVEMENT_IDS.map((id) => ({
    id,
    title: i18n.t(`achievements.${id}.title`),
    description: i18n.t(`achievements.${id}.description`),
    unlocked: evaluateAchievement(id, state),
  }))
}

export function getUnlockedAchievements(state) {
  return getAchievements(state).filter((a) => a.unlocked)
}
