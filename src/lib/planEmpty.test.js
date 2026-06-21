import { describe, expect, it } from 'vitest'
import {
  hasAnyExercises,
  hasWorkoutDays,
  shouldShowExerciseSetupPrompt,
} from './planEmpty'

describe('shouldShowExerciseSetupPrompt', () => {
  it('shows when there are no workout days', () => {
    expect(
      shouldShowExerciseSetupPrompt({
        profile: { workoutDays: [] },
        customExercises: [{ id: '1', name: 'Squat' }],
        workoutSchedule: {},
      })
    ).toBe(true)
  })

  it('shows when there are no exercises anywhere', () => {
    expect(
      shouldShowExerciseSetupPrompt({
        profile: { workoutDays: ['Monday'] },
        customExercises: [],
        workoutSchedule: { Monday: { exercises: [] } },
      })
    ).toBe(true)
  })

  it('hides when days and exercises exist', () => {
    expect(
      shouldShowExerciseSetupPrompt({
        profile: { workoutDays: ['Monday'] },
        customExercises: [{ id: '1', name: 'Squat' }],
        workoutSchedule: { Monday: { exercises: [{ id: 'a', exerciseId: '1' }] } },
      })
    ).toBe(false)
  })

  it('shows after all exercises are removed but days remain', () => {
    expect(hasWorkoutDays({ profile: { workoutDays: ['Monday'] } })).toBe(true)
    expect(
      hasAnyExercises({
        profile: { workoutDays: ['Monday'] },
        customExercises: [],
        workoutSchedule: { Monday: { exercises: [] } },
      })
    ).toBe(false)
    expect(
      shouldShowExerciseSetupPrompt({
        profile: { workoutDays: ['Monday'] },
        customExercises: [],
        workoutSchedule: { Monday: { exercises: [] } },
      })
    ).toBe(true)
  })
})
