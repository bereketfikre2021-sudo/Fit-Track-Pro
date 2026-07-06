/**
 * Preset shopping lists derived from the two built-in meal plan presets.
 * Categories mirror the app's DEFAULT_SHOPPING_CATEGORIES.
 */

// ─── Weight Gain Shopping List ────────────────────────────────────────────────
const WEIGHT_GAIN_SHOPPING = {
  'Protein Sources': [
    { name: 'Eggs (×12)' },
    { name: 'Chicken breast (500g)' },
    { name: 'Beef / Tibs (500g)' },
    { name: 'Kitfo (lean minced beef, 300g)' },
    { name: 'Lamb (300g)' },
    { name: 'Asa / Nile tilapia (300g)' },
    { name: 'Ayib (Ethiopian cheese, 200g)' },
    { name: 'Ergo (Ethiopian yogurt, 1L)' },
    { name: 'Milk, whole (2L)' },
    { name: 'Groundnuts / peanuts (250g)' },
    { name: 'Peanut butter (1 jar)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 14 pieces)' },
    { name: 'Teff flour (1 kg)' },
    { name: 'White rice (1 kg)' },
    { name: 'Pasta / Macaroni (500g)' },
    { name: 'Genfo flour (sorghum, 500g)' },
    { name: 'Ambasha bread (×2 loaves)' },
    { name: 'Misir (red lentils, 500g)' },
    { name: 'Shiro powder (500g)' },
    { name: 'Ater kik (yellow split peas, 500g)' },
    { name: 'Chickpeas (500g)' },
  ],
  'Healthy Fats': [
    { name: 'Avocado (×4)' },
    { name: 'Niter kibbeh / butter (200g)' },
    { name: 'Cooking oil (500ml)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Bananas (×6)' },
    { name: 'Mango (×2)' },
    { name: 'Papaya (×1)' },
    { name: 'Guava (×4)' },
    { name: 'Gomen (collard greens, 1 bunch)' },
    { name: 'Tikel gomen (cabbage, ×1 head)' },
    { name: 'Spinach (1 bunch)' },
    { name: 'Tomatoes (×4)' },
    { name: 'Onions (×3)' },
    { name: 'Fosolia (green beans, 300g)' },
  ],
  Other: [
    { name: 'Honey (1 jar)' },
    { name: 'Berbere spice (100g)' },
    { name: 'Chili / mitmita (50g)' },
    { name: 'Dabo kolo (1 pack)' },
    { name: 'Fresh juice (×2 bottles or fruit for juicing)' },
  ],
}

// ─── Weight Loss Shopping List ────────────────────────────────────────────────
const WEIGHT_LOSS_SHOPPING = {
  'Protein Sources': [
    { name: 'Eggs (×8)' },
    { name: 'Chicken breast (500g)' },
    { name: 'Asa / Nile tilapia (400g)' },
    { name: 'Beef, lean (300g)' },
    { name: 'Goat meat (300g)' },
    { name: 'Tuna, canned in water (×3 cans)' },
    { name: 'Ayib (Ethiopian cheese, 150g)' },
    { name: 'Ergo / plain yogurt (500ml)' },
    { name: 'Milk, low-fat (1L)' },
    { name: 'Fava beans / ful (500g)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 7 pieces)' },
    { name: 'Misir (red lentils, 500g)' },
    { name: 'Ater kik (yellow split peas, 500g)' },
    { name: 'Messer (green lentils, 500g)' },
    { name: 'Shiro powder (250g)' },
    { name: 'Sweet potato (×3)' },
    { name: 'Potato (×3)' },
  ],
  'Healthy Fats': [
    { name: 'Cooking oil, light (250ml)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Apples (×4)' },
    { name: 'Oranges (×4)' },
    { name: 'Watermelon (×1 small)' },
    { name: 'Papaya (×1)' },
    { name: 'Guava (×3)' },
    { name: 'Spinach (2 bunches)' },
    { name: 'Gomen (collard greens, 1 bunch)' },
    { name: 'Tikel gomen (cabbage, ×1 head)' },
    { name: 'Tomatoes (×5)' },
    { name: 'Carrots (×4)' },
    { name: 'Onions (×3)' },
    { name: 'Beetroot (×3)' },
    { name: 'Fosolia (green beans, 300g)' },
  ],
  Other: [
    { name: 'Berbere spice (50g)' },
    { name: 'Water (2L bottles ×4)' },
  ],
}

function stampIds(categories) {
  const ts = Date.now()
  let i = 0
  const result = {}
  for (const [cat, items] of Object.entries(categories)) {
    result[cat] = items.map((item) => ({
      ...item,
      id: `preset-shop-${ts}-${i++}`,
      checked: false,
      createdAt: ts,
    }))
  }
  return result
}

export const PRESET_SHOPPING_LISTS = [
  {
    id: 'weight-gain',
    name: 'Weight Gain Shopping List',
    emoji: '💪',
    description: 'Ingredients for ~3 200 kcal/day — high-protein, high-carb Ethiopian foods for muscle building.',
    targetGoals: ['muscle', 'strength'],
    targetBmiCategories: ['underweight'],
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss Shopping List',
    emoji: '🔥',
    description: 'Ingredients for ~1 700 kcal/day — lean proteins and fibre-rich Ethiopian foods for fat loss.',
    targetGoals: ['fat'],
    targetBmiCategories: ['overweight', 'obese'],
  },
]

/**
 * Return only the shopping list presets relevant for this user.
 */
export function getRelevantShoppingLists(bmiCategory, profileGoal) {
  if (bmiCategory === 'underweight') {
    return PRESET_SHOPPING_LISTS.filter((p) => p.targetGoals.includes('muscle') || p.targetGoals.includes('strength'))
  }
  if (bmiCategory === 'overweight' || bmiCategory === 'obese') {
    return PRESET_SHOPPING_LISTS.filter((p) => p.targetGoals.includes('fat'))
  }
  if (profileGoal === 'fat' || profileGoal === 'endurance') {
    return PRESET_SHOPPING_LISTS.filter((p) => p.targetGoals.includes('fat'))
  }
  return PRESET_SHOPPING_LISTS.filter((p) => !p.targetGoals.includes('fat'))
}

/** Get the pre-stamped shopping list items for a given preset id */
export function buildPresetShoppingList(presetId) {
  if (presetId === 'weight-gain') return stampIds(WEIGHT_GAIN_SHOPPING)
  if (presetId === 'weight-loss') return stampIds(WEIGHT_LOSS_SHOPPING)
  return null
}

/** Return the recommended preset id based on BMI category and goal */
export function getRecommendedShoppingListId(bmiCategory, profileGoal) {
  for (const p of PRESET_SHOPPING_LISTS) {
    if (bmiCategory && p.targetBmiCategories.includes(bmiCategory)) return p.id
  }
  for (const p of PRESET_SHOPPING_LISTS) {
    if (profileGoal && p.targetGoals.includes(profileGoal)) return p.id
  }
  return null
}
