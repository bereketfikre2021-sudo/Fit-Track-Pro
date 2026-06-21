import i18n from '@/i18n'
import { getWorkoutStreaks } from './streaks'

export const ACHIEVEMENT_IDS = [
  'first_completion',
  'first_session',
  'streak_3',
  'sessions_10',
  'exercises_50',
]

function countCompletedExercises(completedExercises) {
  return Object.values(completedExercises || {}).filter(
    (e) => e?.completedAt && !e?.skipped
  ).length
}

function evaluateAchievement(id, state) {
  const completedExercises = state.completedExercises || {}
  const completedSessions = state.completedSessions || []
  const streaks = getWorkoutStreaks(completedExercises)
  const exerciseCount = countCompletedExercises(completedExercises)

  switch (id) {
    case 'first_completion':
      return exerciseCount >= 1
    case 'first_session':
      return completedSessions.length >= 1
    case 'streak_3':
      return streaks.current >= 3
    case 'sessions_10':
      return completedSessions.length >= 10
    case 'exercises_50':
      return exerciseCount >= 50
    default:
      return false
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
