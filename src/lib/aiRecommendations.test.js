import { describe, expect, it } from 'vitest'
import { getEffectiveGoalForAi, parseJsonFromModelText } from './aiRecommendations'
import {
  hasAnyExercises,
  isExerciseLibraryEmpty,
  isMealPlanEmpty,
  isShoppingListEmpty,
} from './planEmpty'

describe('getEffectiveGoalForAi', () => {
  it('uses BMI-based fat loss even when profile.goal is muscle', () => {
    expect(
      getEffectiveGoalForAi({
        goal: 'muscle',
        currentWeight: 90,
        height: 170,
        gender: 'female',
        targetWeight: '65',
      })
    ).toBe('fat')
  })
})

describe('parseJsonFromModelText', () => {
  it('parses raw JSON', () => {
    expect(parseJsonFromModelText('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses fenced JSON', () => {
    const input = 'Here you go:\n```json\n{"mealPlan":{}}\n```'
    expect(parseJsonFromModelText(input)).toEqual({ mealPlan: {} })
  })
})

describe('planEmpty', () => {
  it('detects empty exercise library regardless of schedule', () => {
    expect(
      isExerciseLibraryEmpty({
        customExercises: [],
        workoutSchedule: { Monday: { exercises: [{ name: 'Squat' }] } },
      })
    ).toBe(true)
  })

  it('detects empty exercises', () => {
    expect(hasAnyExercises({ customExercises: [], workoutSchedule: {} })).toBe(false)
    expect(
      hasAnyExercises({
        customExercises: [{ id: '1', name: 'Squat' }],
        workoutSchedule: {},
      })
    ).toBe(true)
  })

  it('detects empty shopping list', () => {
    expect(isShoppingListEmpty({})).toBe(true)
    expect(
      isShoppingListEmpty({ 'Protein Sources': [{ id: '1', name: 'Eggs', checked: false }] })
    ).toBe(false)
  })

  it('detects empty meal plan', () => {
    expect(isMealPlanEmpty({ Monday: { breakfast: [] } })).toBe(true)
    expect(
      isMealPlanEmpty({
        Monday: { breakfast: [{ name: 'Eggs', calories: 200, protein: 12 }] },
      })
    ).toBe(false)
  })
})
