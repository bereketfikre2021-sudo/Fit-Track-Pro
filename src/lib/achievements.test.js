import { describe, it, expect } from 'vitest'
import { getAchievements } from './achievements'

describe('achievements', () => {
  it('unlocks first_completion when an exercise is done', () => {
    const list = getAchievements({
      completedExercises: {
        k1: { date: '2026-05-26', day: 'Monday', completedAt: 1, skipped: false },
      },
      completedSessions: [],
      profile: { workoutDays: [] },
      workoutSchedule: {},
    })
    const first = list.find((a) => a.id === 'first_completion')
    expect(first.unlocked).toBe(true)
  })

  it('does not unlock first_completion for skipped only', () => {
    const list = getAchievements({
      completedExercises: {
        k1: { date: '2026-05-26', day: 'Monday', skipped: true },
      },
      completedSessions: [],
      profile: { workoutDays: [] },
      workoutSchedule: {},
    })
    expect(list.find((a) => a.id === 'first_completion').unlocked).toBe(false)
  })
})
