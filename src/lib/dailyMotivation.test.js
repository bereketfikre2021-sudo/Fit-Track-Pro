import { describe, it, expect } from 'vitest'
import { DAILY_MOTIVATION, getDailyMotivation } from './dailyMotivation'

describe('dailyMotivation', () => {
  const june2026 = {
    Sunday: new Date(2026, 5, 7),
    Monday: new Date(2026, 5, 1),
    Tuesday: new Date(2026, 5, 2),
    Wednesday: new Date(2026, 5, 3),
    Thursday: new Date(2026, 5, 4),
    Friday: new Date(2026, 5, 5),
    Saturday: new Date(2026, 5, 6),
  }

  it('returns a quote for each weekday', () => {
    for (const [day, date] of Object.entries(june2026)) {
      expect(getDailyMotivation(date)).toEqual(DAILY_MOTIVATION[day])
    }
  })
})
