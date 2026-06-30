import { describe, it, expect } from 'vitest'
import { getWeeklyWorkoutReport, compareWeekOverWeek } from './workoutInsights'

describe('workoutInsights', () => {
  const baseState = {
    profile: { workoutDays: ['Monday', 'Wednesday'] },
    customExercises: [{ id: 'lib1', name: 'Squat', muscleGroups: ['Legs'] }],
    workoutSchedule: {
      Monday: { exercises: [{ id: 's1', exerciseId: 'lib1', name: 'Squat' }] },
    },
    completedExercises: {},
  }

  it('compareWeekOverWeek returns delta between weeks', () => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`

    const state = {
      ...baseState,
      completedExercises: {
        k1: {
          date: dateStr,
          day: 'Monday',
          exerciseId: 's1',
          completedAt: Date.now(),
        },
      },
    }

    const cmp = compareWeekOverWeek(state)
    expect(cmp.current.exercisesCompletedCount).toBe(1)
    expect(cmp.previous.exercisesCompletedCount).toBe(0)
    expect(cmp.delta.exercisesCompleted).toBe(1)
  })

  it('does not mark a rest-day calendar slot when plan day was done off-schedule', () => {
    const weekStart = new Date()
    const day = weekStart.getDay()
    const offset = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + offset)
    const wed = new Date(weekStart)
    wed.setDate(wed.getDate() + 2)
    const y = wed.getFullYear()
    const m = String(wed.getMonth() + 1).padStart(2, '0')
    const d = String(wed.getDate()).padStart(2, '0')
    const wedStr = `${y}-${m}-${d}`

    const report = getWeeklyWorkoutReport(
      {
        ...baseState,
        profile: { workoutDays: ['Monday', 'Tuesday', 'Thursday'] },
        completedExercises: {
          k1: {
            date: wedStr,
            day: 'Tuesday',
            exerciseId: 's1',
            completedAt: Date.now(),
          },
        },
      },
      0
    )

    const wedSlot = report.daysThisWeek.find((slot) => slot.label === 'Wednesday')
    expect(wedSlot.worked).toBe(false)
    expect(report.planDaysWorked).toContain('Tuesday')
  })

  it('getWeeklyWorkoutReport supports week offset', () => {
    const current = getWeeklyWorkoutReport(baseState, 0)
    const previous = getWeeklyWorkoutReport(baseState, -1)
    expect(current.weekRangeLabel).toBeTruthy()
    expect(previous.weekRangeLabel).toBeTruthy()
    expect(current.weekOffset).toBe(0)
    expect(previous.weekOffset).toBe(-1)
  })
})
