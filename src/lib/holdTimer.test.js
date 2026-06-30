import { describe, it, expect } from 'vitest'
import {
  HOLD_READY_SECONDS,
  createHoldTimer,
  parseHoldSeconds,
  getHoldReadyRemaining,
  getHoldRemaining,
} from './holdTimer'

describe('holdTimer', () => {
  it('parses hold duration in seconds and minutes', () => {
    expect(parseHoldSeconds({ duration: '45', durationUnit: 'seconds' })).toBe(45)
    expect(parseHoldSeconds({ duration: '2', durationUnit: 'minutes' })).toBe(120)
    expect(parseHoldSeconds({})).toBe(30)
  })

  it('creates timer in ready phase', () => {
    const timer = createHoldTimer(60, 'Plank')
    expect(timer.phase).toBe('ready')
    expect(timer.holdSeconds).toBe(60)
    expect(timer.readyTotalSeconds).toBe(HOLD_READY_SECONDS)
    expect(timer.label).toBe('Plank')
    expect(getHoldReadyRemaining(timer)).toBeGreaterThan(0)
  })

  it('counts down hold remaining', () => {
    const holdEndsAt = Date.now() + 5000
    expect(getHoldRemaining(holdEndsAt)).toBeGreaterThanOrEqual(4)
    expect(getHoldRemaining(holdEndsAt)).toBeLessThanOrEqual(5)
  })
})
