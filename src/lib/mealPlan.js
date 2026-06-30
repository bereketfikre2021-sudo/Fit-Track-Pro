export const MEAL_SLOT_IDS = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
  'beforeBed',
]

export function parseMacro(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function getDayMacroTotals(mealPlan, day) {
  const dayMeals = mealPlan?.[day] || {}
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let itemCount = 0

  MEAL_SLOT_IDS.forEach((slot) => {
    const foods = dayMeals[slot] || []
    itemCount += foods.length
    foods.forEach((food) => {
      calories += parseMacro(food.calories)
      protein += parseMacro(food.protein)
      carbs += parseMacro(food.carbs)
      fat += parseMacro(food.fat)
    })
  })

  return { calories, protein, carbs, fat, itemCount }
}

export function collectAllFoodNames(mealPlan) {
  const names = new Set()
  Object.values(mealPlan || {}).forEach((dayMeals) => {
    MEAL_SLOT_IDS.forEach((slot) => {
      ;(dayMeals?.[slot] || []).forEach((food) => {
        const name = food.name?.trim()
        if (name) names.add(name)
      })
    })
  })
  return [...names]
}

export function formatMacroSummary({ calories, protein, carbs, fat }) {
  const parts = []
  if (calories > 0) parts.push(`${Math.round(calories)} kcal`)
  if (protein > 0) parts.push(`${Math.round(protein)}g protein`)
  if (carbs > 0) parts.push(`${Math.round(carbs)}g carbs`)
  if (fat > 0) parts.push(`${Math.round(fat)}g fat`)
  return parts.length ? parts.join(' · ') : null
}
