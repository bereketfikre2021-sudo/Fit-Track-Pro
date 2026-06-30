import { describe, it, expect } from 'vitest'
import { parseRestSeconds, formatCountdown, getRemainingSeconds } from './restTimer'

describe('restTimer', () => {
  it('parses rest seconds with fallback', () => {
    expect(parseRestSeconds('90')).toBe(90)
    expect(parseRestSeconds('', 45)).toBe(45)
    expect(parseRestSeconds('bad', 60)).toBe(60)
  })

  it('formats countdown', () => {
    expect(formatCountdown(90)).toBe('1:30')
    expect(formatCountdown(45)).toBe('45s')
  })

  it('computes remaining seconds', () => {
    const endsAt = Date.now() + 5000
    expect(getRemainingSeconds(endsAt)).toBeGreaterThanOrEqual(4)
    expect(getRemainingSeconds(endsAt)).toBeLessThanOrEqual(5)
  })
})
