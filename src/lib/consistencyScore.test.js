import { describe, it, expect } from 'vitest'
import { getWeeklyConsistency } from './consistencyScore'

describe('consistencyScore', () => {
  it('returns null when no workout days configured', () => {
    expect(getWeeklyConsistency({ profile: { workoutDays: [] } })).toBeNull()
  })

  it('computes percent of plan days completed this week', () => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const result = getWeeklyConsistency({
      profile: { workoutDays: ['Monday', 'Wednesday', 'Friday'] },
      workoutSchedule: {
        Monday: { exercises: [{ id: '1', name: 'Squat' }] },
        Wednesday: { exercises: [{ id: '2', name: 'Press' }] },
        Friday: { exercises: [{ id: '3', name: 'Pull' }] },
      },
      completedExercises: {
        k1: { date: dateStr, day: 'Monday', exerciseId: '1', completedAt: 1 },
        k2: { date: dateStr, day: 'Wednesday', exerciseId: '2', completedAt: 1 },
      },
    })

    expect(result.percent).toBe(67)
    expect(result.completedDays).toBe(2)
    expect(result.plannedDays).toBe(3)
  })
})
