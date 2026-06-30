import { describe, it, expect } from 'vitest'
import { isCompletedEntry, isSkippedEntry, getSkipReasonLabel } from './exerciseSkip'

describe('exerciseSkip', () => {
  it('detects skipped vs completed entries', () => {
    expect(isSkippedEntry({ skipped: true })).toBe(true)
    expect(isCompletedEntry({ completedAt: 1 })).toBe(true)
    expect(isCompletedEntry({ completedAt: 1, skipped: true })).toBe(false)
  })

  it('labels skip reasons', () => {
    expect(getSkipReasonLabel('injury')).toBe('Injury / pain')
  })
})
