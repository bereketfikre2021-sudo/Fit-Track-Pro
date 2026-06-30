import { describe, it, expect } from 'vitest'
import { EXERCISE_PHASE } from './exercisePhase'
import { buildExerciseTarget, formatExerciseTarget, normalizeHoldFields } from './exerciseFormat'

describe('exerciseFormat', () => {
  it('formats main exercises as sets×reps', () => {
    expect(
      formatExerciseTarget({
        exercisePhase: EXERCISE_PHASE.MAIN,
        sets: '4',
        reps: '8',
        isTimeBased: false,
      })
    ).toBe('4×8')
  })

  it('formats warmup exercises with sets and reps like main', () => {
    expect(
      formatExerciseTarget({
        exercisePhase: EXERCISE_PHASE.WARMUP,
        sets: '3',
        reps: '10',
        isTimeBased: false,
        duration: '30',
        durationUnit: 'seconds',
      })
    ).toBe('3×10')
  })

  it('formats cooldown hold exercises with sets and duration', () => {
    expect(
      formatExerciseTarget({
        exercisePhase: EXERCISE_PHASE.COOLDOWN,
        sets: '2',
        reps: '0',
        isTimeBased: true,
        duration: '45',
        durationUnit: 'seconds',
      })
    ).toBe('2 sets × 45s')
  })

  it('formats hold exercises with zero sets/reps as duration only', () => {
    expect(
      buildExerciseTarget({
        isTimeBased: true,
        sets: '0',
        reps: '0',
        duration: '60',
        durationUnit: 'seconds',
      })
    ).toBe('60s')
  })

  it('normalizes empty hold sets and reps to zero', () => {
    expect(
      normalizeHoldFields({ isTimeBased: true, sets: '', reps: '' })
    ).toEqual({ isTimeBased: true, sets: '0', reps: '0' })
  })

  it('builds hold targets with optional reps', () => {
    expect(
      buildExerciseTarget({
        isTimeBased: true,
        sets: '3',
        reps: '5',
        duration: '60',
        durationUnit: 'seconds',
      })
    ).toBe('3 sets × 5 reps × 60s')
  })
})
