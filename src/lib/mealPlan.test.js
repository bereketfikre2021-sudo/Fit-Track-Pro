import { describe, it, expect } from 'vitest'
import { getDayMacroTotals, formatMacroSummary } from './mealPlan'

describe('mealPlan', () => {
  it('sums calories and protein for a day', () => {
    const mealPlan = {
      Monday: {
        breakfast: [{ name: 'Eggs', calories: 200, protein: 14 }],
        lunch: [{ name: 'Chicken', calories: 350, protein: 40 }],
      },
    }
    expect(getDayMacroTotals(mealPlan, 'Monday')).toEqual({
      calories: 550,
      protein: 54,
      itemCount: 2,
    })
  })

  it('formatMacroSummary builds label', () => {
    expect(formatMacroSummary({ calories: 500, protein: 30 })).toBe(
      '500 kcal · 30g protein'
    )
  })
})
