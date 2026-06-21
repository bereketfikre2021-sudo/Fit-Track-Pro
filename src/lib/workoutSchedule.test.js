import { describe, it, expect } from 'vitest'
import { copyDaySchedule, reorderDayExercises } from './workoutSchedule'

describe('workoutSchedule copy/reorder', () => {
  const schedule = {
    Monday: {
      note: 'Push',
      exercises: [{ id: 'a1', exerciseId: 'lib1', name: 'Press' }],
    },
    Wednesday: { note: '', exercises: [] },
  }

  it('copies exercises to another day', () => {
    const next = copyDaySchedule(schedule, 'Monday', ['Wednesday'])
    expect(next.Wednesday.exercises).toHaveLength(1)
    expect(next.Wednesday.exercises[0].name).toBe('Press')
    expect(next.Wednesday.exercises[0].id).not.toBe('a1')
  })

  it('reorders exercises within a day', () => {
    const sched = {
      Monday: {
        exercises: [
          { id: '1', name: 'A' },
          { id: '2', name: 'B' },
        ],
      },
    }
    const next = reorderDayExercises(sched, 'Monday', 0, 1)
    expect(next.Monday.exercises[0].name).toBe('B')
    expect(next.Monday.exercises[1].name).toBe('A')
  })
})
