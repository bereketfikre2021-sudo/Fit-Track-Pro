import { describe, it, expect } from 'vitest'
import { getSessionHistory } from './sessionHistory'

describe('sessionHistory', () => {
  it('formats sessions newest first', () => {
    const list = getSessionHistory([
      { id: '1', day: 'Monday', date: '2026-01-01', startedAt: 0, endedAt: 60000, completedCount: 2, totalCount: 3 },
      { id: '2', day: 'Friday', date: '2026-01-03', startedAt: 0, endedAt: 120000, completedCount: 4, totalCount: 4 },
    ])
    expect(list[0].day).toBe('Friday')
    expect(list[0].durationLabel).toBe('2:00')
    expect(list[0].completionLabel).toBe('4/4 exercises')
  })
})
