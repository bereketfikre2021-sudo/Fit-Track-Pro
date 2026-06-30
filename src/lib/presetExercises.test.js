import { describe, it, expect } from 'vitest'
import {
  getPresetExercises,
  getPresetFilterOptions,
  addPresetsToLibrary,
  filterPresetExercises,
  isPresetInLibrary,
  EXERCISE_CATEGORIES,
} from './presetExercises'

describe('presetExercises', () => {
  it('exposes 60 curated presets across three categories', () => {
    const presets = getPresetExercises()
    expect(presets).toHaveLength(60)

    const byCategory = presets.reduce((acc, ex) => {
      acc[ex.category] = (acc[ex.category] || 0) + 1
      return acc
    }, {})

    expect(byCategory.Strength).toBe(45)
    expect(byCategory.Cardio).toBe(8)
    expect(byCategory.Mobility).toBe(7)
    expect(EXERCISE_CATEGORIES).toEqual(['Strength', 'Cardio', 'Mobility'])
  })

  it('stores muscleGroup as array with splits and goals', () => {
    const pushUp = getPresetExercises().find((ex) => ex.name === 'Push-Up')
    expect(pushUp.muscleGroup).toEqual(['Chest', 'Triceps'])
    expect(pushUp.splits).toContain('Push')
    expect(pushUp.goals).toContain('Muscle Gain')
    expect(pushUp.equipment).toBe('Bodyweight')
  })

  it('matches secondary muscles when filtering', () => {
    const presets = getPresetExercises()
    const chest = filterPresetExercises(presets, { muscleFilter: 'Chest' })
    expect(chest.some((ex) => ex.name === 'Close-Grip Bench Press')).toBe(true)
  })

  it('filters by split and goal', () => {
    const presets = getPresetExercises()
    const pushDay = filterPresetExercises(presets, {
      splitFilter: 'Push',
      goalFilter: 'Muscle Gain',
    })
    expect(pushDay.length).toBeGreaterThan(0)
    expect(pushDay.every((ex) => ex.splits.includes('Push'))).toBe(true)
  })

  it('exposes strength muscle chips including biceps, triceps, and full body', () => {
    const options = getPresetFilterOptions(getPresetExercises(), { categoryFilter: 'Strength' })
    expect(options.muscles).toContain('Full Body')
    expect(options.muscles).toContain('Chest')
    expect(options.muscles).toContain('Biceps')
    expect(options.muscles).toContain('Triceps')
  })

  it('filters by equipment, difficulty, location, and search', () => {
    const presets = getPresetExercises()
    const homeBodyweight = filterPresetExercises(presets, {
      equipmentFilter: 'Bodyweight',
      locationFilter: 'Home',
    })
    expect(homeBodyweight.length).toBeGreaterThan(0)
    expect(homeBodyweight.every((ex) => ex.equipment === 'Bodyweight' && ex.location === 'Home')).toBe(
      true
    )

    const bench = filterPresetExercises(presets, { searchQuery: 'bench' })
    expect(bench.some((ex) => ex.name === 'Bench Press')).toBe(true)

    const beginner = filterPresetExercises(presets, { difficultyFilter: 'Beginner' })
    expect(beginner.every((ex) => ex.difficulty === 'Beginner')).toBe(true)
  })

  it('adds presets to library with full metadata', () => {
    const presets = getPresetExercises()
    const first = presets[0]
    const { customExercises, added } = addPresetsToLibrary([], [first])
    expect(added).toHaveLength(1)
    expect(customExercises[0].muscleGroup).toEqual(first.muscleGroup)
    expect(customExercises[0].splits).toEqual(first.splits)
    expect(customExercises[0].goals).toEqual(first.goals)

    const again = addPresetsToLibrary(customExercises, [first])
    expect(again.added).toHaveLength(0)
  })

  it('detects presets already in library by name', () => {
    const presets = getPresetExercises()
    const { customExercises } = addPresetsToLibrary([], [presets[0]])
    expect(isPresetInLibrary(presets[0].name, customExercises)).toBe(true)
  })
})
