import { describe, it, expect } from 'vitest'
import { addBodyLog, removeBodyLog, getLatestBodyLog } from './bodyLogs'

describe('bodyLogs', () => {
  it('adds and sorts entries', () => {
    const logs = addBodyLog([], { date: '2026-05-20', weightKg: 80 })
    const next = addBodyLog(logs, { date: '2026-05-25', weightKg: 78.5 })
    expect(next).toHaveLength(2)
    expect(getLatestBodyLog(next).weightKg).toBe(78.5)
  })

  it('rejects invalid weight', () => {
    expect(addBodyLog([], { date: '2026-05-20', weightKg: '' })).toBeNull()
  })

  it('removes by id', () => {
    const logs = addBodyLog([], { date: '2026-05-20', weightKg: 70 })
    const removed = removeBodyLog(logs, logs[0].id)
    expect(removed).toHaveLength(0)
  })
})
