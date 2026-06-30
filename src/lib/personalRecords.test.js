import { describe, it, expect } from 'vitest'
import {
  getPersonalRecord,
  isNewPersonalRecord,
  formatBestSet,
} from './personalRecords'

describe('personalRecords', () => {
  const libId = 'ex-1'

  it('finds best set across history', () => {
    const completed = {
      k1: {
        libraryExerciseId: libId,
        sets: [
          { setNumber: 1, weightKg: '50', reps: '10' },
          { setNumber: 2, weightKg: '55', reps: '8' },
        ],
      },
    }
    const pr = getPersonalRecord(completed, libId)
    expect(pr.label).toBe(formatBestSet({ weightKg: '55', reps: '8' }))
  })

  it('detects new PR', () => {
    const completed = {
      k1: {
        libraryExerciseId: libId,
        sets: [{ setNumber: 1, weightKg: '50', reps: '10' }],
      },
    }
    const todaySets = [{ setNumber: 1, weightKg: '60', reps: '10' }]
    expect(isNewPersonalRecord(completed, libId, todaySets, 'k2')).toBe(true)
  })
})
