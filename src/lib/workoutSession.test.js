import { describe, it, expect } from 'vitest'
import {
  areAllMainExercisesCompleted,
  completionKey,
  countDayCompletions,
  countMainDayCompletions,
  finishWorkoutSession,
  getMainExercisesForDay,
  skipWorkoutForToday,
  startWorkoutSession,
} from './workoutSession'

describe('workoutSession', () => {
  it('builds stable completion keys', () => {
    expect(completionKey('2026-05-26', 'Monday', 'ex-1')).toBe('2026-05-26-Monday-ex-1')
  })

  it('counts completions for a day', () => {
    const completed = {
      '2026-05-26-Monday-a': { date: '2026-05-26', day: 'Monday', completedAt: 1 },
      '2026-05-26-Monday-b': { date: '2026-05-26', day: 'Monday', completedAt: 2 },
    }
    expect(countDayCompletions(completed, 'Monday', '2026-05-26')).toBe(2)
  })

  it('does not count skipped entries', () => {
    const completed = {
      '2026-05-26-Monday-a': { date: '2026-05-26', day: 'Monday', completedAt: 1 },
      '2026-05-26-Monday-b': { date: '2026-05-26', day: 'Monday', skipped: true },
    }
    expect(countDayCompletions(completed, 'Monday', '2026-05-26')).toBe(1)
  })

  it('detects when all main exercises are completed', () => {
    const mainExercises = [{ id: 'a' }, { id: 'b' }]
    const partial = {
      '2026-05-26-Monday-a': { date: '2026-05-26', day: 'Monday', completedAt: 1 },
    }
    expect(areAllMainExercisesCompleted(partial, mainExercises, 'Monday', '2026-05-26')).toBe(
      false
    )

    const complete = {
      ...partial,
      '2026-05-26-Monday-b': { date: '2026-05-26', day: 'Monday', completedAt: 2 },
    }
    expect(areAllMainExercisesCompleted(complete, mainExercises, 'Monday', '2026-05-26')).toBe(
      true
    )
  })

  it('finishes session with all-exercise counts (warmup + main + cooldown)', () => {
    const active = startWorkoutSession('Monday', '2026-05-26')
    const state = {
      customExercises: [
        { id: 'lib-main', exercisePhase: 'main' },
        { id: 'lib-warm', category: 'Warm-up' },
      ],
      completedExercises: {
        '2026-05-26-Monday-a': { date: '2026-05-26', day: 'Monday', completedAt: 1 },
        '2026-05-26-Monday-w': { date: '2026-05-26', day: 'Monday', completedAt: 2 },
      },
      workoutSchedule: {
        Monday: {
          exercises: [
            { id: 'a', exerciseId: 'lib-main' },
            { id: 'b', exerciseId: 'lib-main' },
            { id: 'w', exerciseId: 'lib-warm' },
          ],
        },
      },
      completedSessions: [],
    }
    const mainExercises = getMainExercisesForDay(state, 'Monday')
    expect(mainExercises).toHaveLength(2)
    expect(countMainDayCompletions(state.completedExercises, mainExercises, 'Monday', '2026-05-26')).toBe(1)

    const result = finishWorkoutSession(active, state)
    expect(result.completedSessions).toHaveLength(1)
    // completedCount and totalCount now cover all phases (warmup + main + cooldown)
    expect(result.completedSessions[0].completedCount).toBe(2) // a + w completed
    expect(result.completedSessions[0].totalCount).toBe(3)     // a + b + w total
    // mainCompletedCount preserved for legacy stats
    expect(result.completedSessions[0].mainCompletedCount).toBe(1)
    expect(result.activeWorkoutSession).toBeNull()
  })

  it('skips all exercises and records a skipped session for today', () => {
    const state = {
      customExercises: [{ id: 'lib-main', exercisePhase: 'main' }],
      completedExercises: {},
      workoutSchedule: {
        Monday: {
          exercises: [
            { id: 'a', exerciseId: 'lib-main' },
            { id: 'b', exerciseId: 'lib-main' },
          ],
        },
      },
      completedSessions: [],
      activeWorkoutSession: { day: 'Monday', date: '2026-05-26', startedAt: 1 },
    }

    const result = skipWorkoutForToday(state, 'Monday', 'busy', '2026-05-26')
    expect(result.completedExercises['2026-05-26-Monday-a']?.skipped).toBe(true)
    expect(result.completedExercises['2026-05-26-Monday-b']?.skipReason).toBe('busy')
    expect(result.completedSessions).toHaveLength(1)
    expect(result.completedSessions[0]).toMatchObject({
      skipped: true,
      skipReason: 'busy',
      totalCount: 2,
      completedCount: 0,
    })
    expect(result.activeWorkoutSession).toBeNull()
  })
})
