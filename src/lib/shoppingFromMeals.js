import { collectAllFoodNames } from './mealPlan'

const CATEGORY_RULES = [
  {
    category: 'Protein Sources',
    keywords: [
      'egg',
      'chicken',
      'beef',
      'fish',
      'salmon',
      'tuna',
      'turkey',
      'protein',
      'whey',
      'yogurt',
      'cottage',
      'tofu',
      'shrimp',
      'meat',
      'steak',
      'pork',
    ],
  },
  {
    category: 'Carb Sources',
    keywords: ['rice', 'bread', 'pasta', 'oat', 'potato', 'quinoa', 'cereal', 'bagel', 'tortilla'],
  },
  {
    category: 'Healthy Fats',
    keywords: ['avocado', 'olive', 'nut', 'almond', 'peanut', 'butter', 'oil', 'seed', 'cheese'],
  },
  {
    category: 'Vegetables',
    keywords: [
      'broccoli',
      'spinach',
      'lettuce',
      'carrot',
      'pepper',
      'tomato',
      'cucumber',
      'vegetable',
      'salad',
      'kale',
      'onion',
    ],
  },
  {
    category: 'Fruits',
    keywords: ['apple', 'banana', 'berry', 'orange', 'grape', 'fruit', 'melon', 'mango'],
  },
]

function normalizeName(name) {
  return name.trim().toLowerCase()
}

export function suggestShoppingCategory(foodName) {
  const lower = normalizeName(foodName)
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return category
  }
  return 'Other'
}

function shoppingHasName(shoppingList, name) {
  const norm = normalizeName(name)
  return Object.values(shoppingList || {}).some((items) =>
    (items || []).some((item) => normalizeName(item.name) === norm)
  )
}

/** Add meal-plan foods to shopping list (skips duplicates). */
export function mergeMealsIntoShoppingList(mealPlan, shoppingList) {
  const next = { ...shoppingList }
  const foodNames = collectAllFoodNames(mealPlan)
  let added = 0

  foodNames.forEach((name) => {
    if (shoppingHasName(next, name)) return
    const category = suggestShoppingCategory(name)
    if (!next[category]) next[category] = []
    next[category] = [
      ...next[category],
      {
        id: `meal-${Date.now()}-${added}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        checked: false,
        createdAt: Date.now(),
      },
    ]
    added += 1
  })

  return { shoppingList: next, addedCount: added }
}
