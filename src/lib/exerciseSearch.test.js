import { describe, it, expect } from 'vitest'
import { filterExerciseLibrary } from './exerciseSearch'
import { EXERCISE_PHASE } from './exercisePhase'

describe('exerciseSearch', () => {
  const exercises = [
    { id: '1', name: 'Bench Press', exercisePhase: 'main', muscleGroups: ['Chest'], equipment: 'Barbell' },
    { id: '2', name: 'Arm Circles', exercisePhase: 'warmup', muscleGroups: [], equipment: '' },
  ]

  it('filters by phase and search', () => {
    const result = filterExerciseLibrary(exercises, {
      phase: EXERCISE_PHASE.MAIN,
      searchQuery: 'bench',
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bench Press')
  })

  it('filters by muscle', () => {
    const result = filterExerciseLibrary(exercises, {
      phase: EXERCISE_PHASE.MAIN,
      muscleFilter: 'Chest',
    })
    expect(result).toHaveLength(1)
  })

  it('filters by category, split, and goal', () => {
    const list = [
      {
        id: '1',
        name: 'Push-Up',
        exercisePhase: 'main',
        category: 'Strength',
        muscleGroup: ['Chest', 'Triceps'],
        muscleGroups: ['Chest', 'Triceps'],
        splits: ['Upper Body', 'Push'],
        goals: ['Muscle Gain', 'General Fitness'],
        equipment: 'Bodyweight',
        difficulty: 'Beginner',
      },
      {
        id: '2',
        name: 'Running',
        exercisePhase: 'main',
        category: 'Cardio',
        muscleGroup: ['Full Body'],
        splits: ['Full Body'],
        goals: ['Weight Loss'],
        equipment: 'Bodyweight',
        difficulty: 'Intermediate',
      },
    ]

    expect(
      filterExerciseLibrary(list, {
        splitFilter: 'Push',
        goalFilter: 'Muscle Gain',
      })
    ).toHaveLength(1)

    expect(
      filterExerciseLibrary(list, {
        categoryFilter: 'Strength',
        muscleFilter: 'Chest',
        difficultyFilter: 'Beginner',
      })
    ).toHaveLength(1)
  })
})
