import { describe, it, expect } from 'vitest'
import {
  getActiveWorkoutDates,
  getCurrentStreak,
  getLongestStreak,
  getWorkoutStreaks,
} from './streaks'

describe('streaks', () => {
  const completed = {
    a: { date: '2026-05-24', day: 'Monday', exerciseId: '1' },
    b: { date: '2026-05-25', day: 'Tuesday', exerciseId: '2' },
    c: { date: '2026-05-26', day: 'Wednesday', exerciseId: '3' },
  }

  it('collects unique active dates', () => {
    expect(getActiveWorkoutDates(completed)).toEqual([
      '2026-05-24',
      '2026-05-25',
      '2026-05-26',
    ])
  })

  it('counts current streak ending on reference day', () => {
    expect(getCurrentStreak(completed, '2026-05-26')).toBe(3)
  })

  it('returns zero when no activity', () => {
    expect(getCurrentStreak({}, '2026-05-26')).toBe(0)
  })

  it('finds longest streak', () => {
    const sparse = {
      a: { date: '2026-05-01' },
      b: { date: '2026-05-02' },
      c: { date: '2026-05-10' },
    }
    expect(getLongestStreak(sparse)).toBe(2)
  })

  it('returns summary object', () => {
    const summary = getWorkoutStreaks(completed, '2026-05-26')
    expect(summary.current).toBe(3)
    expect(summary.longest).toBe(3)
    expect(summary.activeDays).toBe(3)
  })
})
