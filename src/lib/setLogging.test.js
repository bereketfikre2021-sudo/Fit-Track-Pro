import { describe, it, expect } from 'vitest'
import {
  buildDefaultSets,
  addSetRow,
  updateSetRow,
  formatSetsSummary,
  migrateCompletionEntry,
} from './setLogging'

describe('setLogging', () => {
  const mainExercise = {
    sets: '3',
    reps: '10',
    exercisePhase: 'main',
    isTimeBased: false,
  }

  it('builds default sets from exercise', () => {
    const sets = buildDefaultSets(mainExercise)
    expect(sets).toHaveLength(3)
    expect(sets[0].reps).toBe('10')
  })

  it('updates and adds set rows', () => {
    let sets = buildDefaultSets(mainExercise)
    sets = updateSetRow(sets, 1, 'weightKg', '60')
    sets = addSetRow(sets)
    expect(sets).toHaveLength(4)
    expect(formatSetsSummary(sets)).toContain('60kg')
  })

  it('migrates legacy weightUsed', () => {
    const entry = migrateCompletionEntry(
      { weightUsed: '50', notes: '' },
      mainExercise,
      mainExercise
    )
    expect(entry.sets[0].weightKg).toBe('50')
  })
})
