import { describe, it, expect } from 'vitest'
import {
  canStartWorkoutForDay,
  getTodayWorkoutContext,
  isAlignedWorkoutCompletion,
  isPlanDayAlignedWithDate,
} from './calendarDay'

describe('calendarDay', () => {
  it('marks training day when calendar matches plan', () => {
    const wed = new Date(2026, 4, 27)
    const ctx = getTodayWorkoutContext(['Monday', 'Wednesday', 'Friday'], wed)
    expect(ctx.calendarToday).toBe('Wednesday')
    expect(ctx.planDay).toBe('Wednesday')
    expect(ctx.isRestDay).toBe(false)
  })

  it('suggests next workout on rest day', () => {
    const tue = new Date(2026, 4, 26)
    const ctx = getTodayWorkoutContext(['Monday', 'Thursday'], tue)
    expect(ctx.isRestDay).toBe(true)
    expect(ctx.nextWorkoutDay).toBe('Thursday')
  })

  it('rejects completions when plan day does not match calendar date', () => {
    const entry = {
      date: '2026-06-03',
      day: 'Tuesday',
      completedAt: 1,
    }
    expect(isPlanDayAlignedWithDate('Tuesday', '2026-06-03')).toBe(false)
    expect(
      isAlignedWorkoutCompletion(entry, ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'])
    ).toBe(false)
    expect(
      isAlignedWorkoutCompletion(
        { date: '2026-06-02', day: 'Tuesday', completedAt: 1 },
        ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday']
      )
    ).toBe(true)
  })

  it('allows start only on the scheduled calendar day', () => {
    const wed = new Date(2026, 4, 27)
    const days = ['Monday', 'Thursday']
    expect(canStartWorkoutForDay('Thursday', days, wed)).toBe(false)
    expect(canStartWorkoutForDay('Monday', days, wed)).toBe(false)
    const thu = new Date(2026, 4, 28)
    expect(canStartWorkoutForDay('Thursday', days, thu)).toBe(true)
  })
})
