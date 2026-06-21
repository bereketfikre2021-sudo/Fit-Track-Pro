import { describe, it, expect } from 'vitest'
import {
  exerciseMatchesMuscle,
  exerciseMatchesSplit,
  exerciseMatchesGoal,
  normalizeMuscleGroup,
  normalizeEquipment,
  collectFilterOptions,
  toMuscleFilterOptions,
  groupExercisesByCategoryMuscle,
  isSplitCompatibleWithMuscle,
  getMuscleFocusPreview,
  getPrimarySplitForMuscle,
} from './exerciseTaxonomy'

describe('exerciseTaxonomy', () => {
  const pushUp = {
    name: 'Push-Up',
    category: 'Strength',
    muscleGroup: ['Chest', 'Triceps'],
    splits: ['Upper Body', 'Push'],
    goals: ['Muscle Gain', 'Weight Loss', 'General Fitness'],
    equipment: 'Bodyweight',
    difficulty: 'Beginner',
  }

  it('normalizes muscle groups and equipment aliases', () => {
    expect(normalizeMuscleGroup(pushUp)).toEqual(['Chest', 'Triceps'])
    expect(normalizeMuscleGroup({ muscleGroups: ['Back'] })).toEqual(['Back'])
    expect(normalizeEquipment('Cardio Machine')).toBe('Machine')
  })

  it('matches muscle, split, and goal filters consistently', () => {
    expect(exerciseMatchesMuscle(pushUp, 'Chest')).toBe(true)
    expect(exerciseMatchesMuscle(pushUp, 'Legs')).toBe(false)
    expect(exerciseMatchesMuscle(pushUp, 'Triceps')).toBe(true)
    expect(exerciseMatchesSplit(pushUp, 'Push')).toBe(true)
    expect(exerciseMatchesGoal(pushUp, 'Weight Loss')).toBe(true)
  })

  it('includes chip muscles in filter options', () => {
    expect(toMuscleFilterOptions(['Chest', 'Full Body', 'Biceps', 'Back'], 'Strength')).toEqual([
      'Chest',
      'Back',
      'Biceps',
      'Full Body',
    ])
  })

  it('collects split and goal filter options', () => {
    const options = collectFilterOptions([pushUp])
    expect(options.splits).toContain('Push')
    expect(options.goals).toContain('Muscle Gain')
  })

  it('narrows split options when a muscle is already selected', () => {
    const presets = [
      pushUp,
      {
        name: 'Pull-Up',
        category: 'Strength',
        muscleGroup: ['Back'],
        splits: ['Pull', 'Upper Body'],
        goals: ['Strength'],
        equipment: 'Bodyweight',
        difficulty: 'Advanced',
      },
    ]
    const chestOptions = collectFilterOptions(presets, {
      categoryFilter: 'Strength',
      muscleFilter: 'Chest',
    })
    expect(chestOptions.splits).toContain('Push')
    expect(chestOptions.splits).toContain('Upper Body')
    expect(chestOptions.splits).not.toContain('Pull')
  })

  it('detects incompatible muscle and split pairs', () => {
    expect(isSplitCompatibleWithMuscle('Chest', 'Push')).toBe(true)
    expect(isSplitCompatibleWithMuscle('Chest', 'Pull')).toBe(false)
  })

  it('previews upper or lower body from muscle focus', () => {
    expect(getMuscleFocusPreview('Strength', 'Chest')).toMatchObject({
      bodyRegion: 'Upper Body',
      primarySplit: 'Upper Body',
    })
    expect(getMuscleFocusPreview('Strength', 'Legs')).toMatchObject({
      bodyRegion: 'Lower Body',
      primarySplit: 'Lower Body',
    })
    expect(getPrimarySplitForMuscle('Chest', 'Strength')).toBe('Upper Body')
    expect(getMuscleFocusPreview('Cardio', 'Cycling')).toMatchObject({
      bodyRegion: 'Lower Body',
    })
    expect(getMuscleFocusPreview('Mobility', 'Hips')).toMatchObject({
      bodyRegion: 'Lower Body',
    })
  })

  it('groups exercises by category and primary muscle', () => {
    const groups = groupExercisesByCategoryMuscle([pushUp, { ...pushUp, name: 'Bench Press' }])
    expect(groups).toHaveLength(1)
    expect(groups[0].muscle).toBe('Chest')
    expect(groups[0].exercises).toHaveLength(2)

    const curl = {
      name: 'Dumbbell Curl',
      category: 'Strength',
      muscleGroup: ['Biceps'],
      splits: ['Upper Body', 'Pull'],
      goals: ['Muscle Gain'],
      equipment: 'Dumbbell',
      difficulty: 'Beginner',
    }
    const armGroups = groupExercisesByCategoryMuscle([curl])
    expect(armGroups[0].muscle).toBe('Biceps')
  })
})
