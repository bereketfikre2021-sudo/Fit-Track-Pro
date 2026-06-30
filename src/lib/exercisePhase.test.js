import { describe, it, expect } from 'vitest'
import {
  EXERCISE_PHASE,
  inferExercisePhase,
  packSimplePhaseExercise,
  filterExercisesByPhase,
} from './exercisePhase'

describe('exercisePhase', () => {
  it('infers warm-up from category', () => {
    expect(inferExercisePhase({ category: 'Warm-up', exercisePhase: 'main' })).toBe(
      EXERCISE_PHASE.WARMUP
    )
  })

  it('packs simple phase with explicit phase', () => {
    const packed = packSimplePhaseExercise(null, {
      name: 'Stretch',
      duration: '5',
      durationUnit: 'minutes',
      exercisePhase: EXERCISE_PHASE.COOLDOWN,
    })
    expect(packed.exercisePhase).toBe(EXERCISE_PHASE.COOLDOWN)
    expect(packed.category).toBe('Cool-down')
  })

  it('filters library by phase', () => {
    const list = [
      { name: 'A', exercisePhase: 'warmup' },
      { name: 'B', exercisePhase: 'main' },
    ]
    expect(filterExercisesByPhase(list, EXERCISE_PHASE.MAIN)).toHaveLength(1)
  })
})
