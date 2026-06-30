import { describe, it, expect } from 'vitest'
import { suggestShoppingCategory, mergeMealsIntoShoppingList } from './shoppingFromMeals'

describe('shoppingFromMeals', () => {
  it('categorizes protein foods', () => {
    expect(suggestShoppingCategory('Chicken breast')).toBe('Protein Sources')
  })

  it('adds unique foods from meal plan', () => {
    const mealPlan = {
      Monday: { breakfast: [{ name: 'Eggs' }], lunch: [], morningSnack: [], afternoonSnack: [], dinner: [], beforeBed: [] },
    }
    const { shoppingList, addedCount } = mergeMealsIntoShoppingList(mealPlan, {
      'Protein Sources': [],
      'Carb Sources': [],
      'Healthy Fats': [],
      Vegetables: [],
      Fruits: [],
      Other: [],
    })
    expect(addedCount).toBe(1)
    expect(shoppingList['Protein Sources'].some((i) => i.name === 'Eggs')).toBe(true)
  })
})
