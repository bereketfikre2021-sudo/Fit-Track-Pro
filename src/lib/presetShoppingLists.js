/**
 * Preset shopping lists with bilingual item names (name_en + name_am).
 * Use localizedName(item) from localizedField.js to render correctly.
 */

// ─── Weight Gain Shopping List ────────────────────────────────────────────────
const WEIGHT_GAIN_SHOPPING = {
  'Protein Sources': [
    { name: 'Eggs (×12)', name_en: 'Eggs (×12)', name_am: 'እንቁላል (×12)' },
    { name: 'Chicken breast (500g)', name_en: 'Chicken breast (500g)', name_am: 'የዶሮ ደረት (500 ግ.)' },
    { name: 'Beef / Tibs (500g)', name_en: 'Beef / Tibs (500g)', name_am: 'የበሬ ሥጋ / ጥብስ (500 ግ.)' },
    { name: 'Kitfo (lean minced beef, 300g)', name_en: 'Kitfo (lean minced beef, 300g)', name_am: 'ክትፎ (300 ግ.)' },
    { name: 'Lamb (300g)', name_en: 'Lamb (300g)', name_am: 'የበግ ሥጋ (300 ግ.)' },
    { name: 'Asa / Nile tilapia (300g)', name_en: 'Asa / Nile tilapia (300g)', name_am: 'ዓሣ (300 ግ.)' },
    { name: 'Ayib (Ethiopian cheese, 200g)', name_en: 'Ayib (Ethiopian cheese, 200g)', name_am: 'አይብ (200 ግ.)' },
    { name: 'Ergo (Ethiopian yogurt, 1L)', name_en: 'Ergo (Ethiopian yogurt, 1L)', name_am: 'እርጎ (1 ሊ.)' },
    { name: 'Milk, whole (2L)', name_en: 'Milk, whole (2L)', name_am: 'ወተት, ሙሉ ስብ (2 ሊ.)' },
    { name: 'Groundnuts / peanuts (250g)', name_en: 'Groundnuts / peanuts (250g)', name_am: 'ኦቾሎኒ (250 ግ.)' },
    { name: 'Peanut butter (1 jar)', name_en: 'Peanut butter (1 jar)', name_am: 'የኦቾሎኒ ቅቤ (1 ጠርሙስ)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 14 pieces)', name_en: 'Injera (1 pack / 14 pieces)', name_am: 'እንጀራ (1 ፓኬት / 14 ቁ.)' },
    { name: 'Teff flour (1 kg)', name_en: 'Teff flour (1 kg)', name_am: 'የጤፍ ዱቄት (1 ኪ.ግ.)' },
    { name: 'White rice (1 kg)', name_en: 'White rice (1 kg)', name_am: 'ነጭ ሩዝ (1 ኪ.ግ.)' },
    { name: 'Pasta / Macaroni (500g)', name_en: 'Pasta / Macaroni (500g)', name_am: 'ፓስታ / ማካሮኒ (500 ግ.)' },
    { name: 'Genfo flour (sorghum, 500g)', name_en: 'Genfo flour (sorghum, 500g)', name_am: 'የገንፎ ዱቄት (500 ግ.)' },
    { name: 'Ambasha bread (×2 loaves)', name_en: 'Ambasha bread (×2 loaves)', name_am: 'አምባሻ (×2 ዳቦ)' },
    { name: 'Misir (red lentils, 500g)', name_en: 'Misir (red lentils, 500g)', name_am: 'ምስር (500 ግ.)' },
    { name: 'Shiro powder (500g)', name_en: 'Shiro powder (500g)', name_am: 'ሽሮ ዱቄት (500 ግ.)' },
    { name: 'Ater kik (yellow split peas, 500g)', name_en: 'Ater kik (yellow split peas, 500g)', name_am: 'አተር ክክ (500 ግ.)' },
    { name: 'Chickpeas (500g)', name_en: 'Chickpeas (500g)', name_am: 'ሽምብራ (500 ግ.)' },
  ],
  'Healthy Fats': [
    { name: 'Avocado (×4)', name_en: 'Avocado (×4)', name_am: 'አቮካዶ (×4)' },
    { name: 'Niter kibbeh / butter (200g)', name_en: 'Niter kibbeh / butter (200g)', name_am: 'ንጥር ቅቤ / ቅቤ (200 ግ.)' },
    { name: 'Cooking oil (500ml)', name_en: 'Cooking oil (500ml)', name_am: 'የምግብ ዘይት (500 ሚ.ሊ.)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Bananas (×6)', name_en: 'Bananas (×6)', name_am: 'ሙዝ (×6)' },
    { name: 'Mango (×2)', name_en: 'Mango (×2)', name_am: 'ማንጎ (×2)' },
    { name: 'Papaya (×1)', name_en: 'Papaya (×1)', name_am: 'ፓፓያ (×1)' },
    { name: 'Guava (×4)', name_en: 'Guava (×4)', name_am: 'ዘይቱን (×4)' },
    { name: 'Gomen (collard greens, 1 bunch)', name_en: 'Gomen (collard greens, 1 bunch)', name_am: 'ጎመን (1 ዕምቅ)' },
    { name: 'Tikel gomen (cabbage, ×1 head)', name_en: 'Tikel gomen (cabbage, ×1 head)', name_am: 'ጥቅል ጎመን (×1)' },
    { name: 'Spinach (1 bunch)', name_en: 'Spinach (1 bunch)', name_am: 'ስፒናች (1 ዕምቅ)' },
    { name: 'Tomatoes (×4)', name_en: 'Tomatoes (×4)', name_am: 'ቲማቲም (×4)' },
    { name: 'Onions (×3)', name_en: 'Onions (×3)', name_am: 'ቀይ ሽንኩርት (×3)' },
    { name: 'Fosolia (green beans, 300g)', name_en: 'Fosolia (green beans, 300g)', name_am: 'ፎሶሊያ (300 ግ.)' },
  ],
  Other: [
    { name: 'Honey (1 jar)', name_en: 'Honey (1 jar)', name_am: 'ማር (1 ጠርሙስ)' },
    { name: 'Berbere spice (100g)', name_en: 'Berbere spice (100g)', name_am: 'በርበሬ (100 ግ.)' },
    { name: 'Chili / mitmita (50g)', name_en: 'Chili / mitmita (50g)', name_am: 'ሚጥሚጣ (50 ግ.)' },
    { name: 'Dabo kolo (1 pack)', name_en: 'Dabo kolo (1 pack)', name_am: 'ዳቦ ቆሎ (1 ፓኬት)' },
    { name: 'Fresh juice (×2 bottles or fruit for juicing)', name_en: 'Fresh juice (×2 bottles or fruit for juicing)', name_am: 'ትኩስ ጁስ (×2 ጠርሙስ ወይም ፍሬ)' },
  ],
}

// ─── Weight Loss Shopping List ────────────────────────────────────────────────
const WEIGHT_LOSS_SHOPPING = {
  'Protein Sources': [
    { name: 'Eggs (×8)', name_en: 'Eggs (×8)', name_am: 'እንቁላል (×8)' },
    { name: 'Chicken breast (500g)', name_en: 'Chicken breast (500g)', name_am: 'የዶሮ ደረት (500 ግ.)' },
    { name: 'Asa / Nile tilapia (400g)', name_en: 'Asa / Nile tilapia (400g)', name_am: 'ዓሣ (400 ግ.)' },
    { name: 'Beef, lean (300g)', name_en: 'Beef, lean (300g)', name_am: 'የበሬ ሥጋ, ቀጭን (300 ግ.)' },
    { name: 'Goat meat (300g)', name_en: 'Goat meat (300g)', name_am: 'የፍየል ሥጋ (300 ግ.)' },
    { name: 'Tuna, canned in water (×3 cans)', name_en: 'Tuna, canned in water (×3 cans)', name_am: 'ቱና, በውሃ (×3 ቆርቆሮ)' },
    { name: 'Ayib (Ethiopian cheese, 150g)', name_en: 'Ayib (Ethiopian cheese, 150g)', name_am: 'አይብ (150 ግ.)' },
    { name: 'Ergo / plain yogurt (500ml)', name_en: 'Ergo / plain yogurt (500ml)', name_am: 'እርጎ (500 ሚ.ሊ.)' },
    { name: 'Milk, low-fat (1L)', name_en: 'Milk, low-fat (1L)', name_am: 'ወተት, ቀጭን (1 ሊ.)' },
    { name: 'Fava beans / ful (500g)', name_en: 'Fava beans / ful (500g)', name_am: 'ፉል / ባቄላ (500 ግ.)' },
  ],
  'Carb Sources': [
    { name: 'Injera (1 pack / 7 pieces)', name_en: 'Injera (1 pack / 7 pieces)', name_am: 'እንጀራ (1 ፓኬት / 7 ቁ.)' },
    { name: 'Misir (red lentils, 500g)', name_en: 'Misir (red lentils, 500g)', name_am: 'ምስር (500 ግ.)' },
    { name: 'Ater kik (yellow split peas, 500g)', name_en: 'Ater kik (yellow split peas, 500g)', name_am: 'አተር ክክ (500 ግ.)' },
    { name: 'Messer (green lentils, 500g)', name_en: 'Messer (green lentils, 500g)', name_am: 'ምሥር, አረንጓዴ (500 ግ.)' },
    { name: 'Shiro powder (250g)', name_en: 'Shiro powder (250g)', name_am: 'ሽሮ ዱቄት (250 ግ.)' },
    { name: 'Sweet potato (×3)', name_en: 'Sweet potato (×3)', name_am: 'ስኳር ድንች (×3)' },
    { name: 'Potato (×3)', name_en: 'Potato (×3)', name_am: 'ድንች (×3)' },
  ],
  'Healthy Fats': [
    { name: 'Cooking oil, light (250ml)', name_en: 'Cooking oil, light (250ml)', name_am: 'የምግብ ዘይት, ቀላል (250 ሚ.ሊ.)' },
  ],
  'Fruits & Vegetables': [
    { name: 'Apples (×4)', name_en: 'Apples (×4)', name_am: 'ፖም (×4)' },
    { name: 'Oranges (×4)', name_en: 'Oranges (×4)', name_am: 'ብርቱካን (×4)' },
    { name: 'Watermelon (×1 small)', name_en: 'Watermelon (×1 small)', name_am: 'ሐብሐብ (×1 ትንሽ)' },
    { name: 'Papaya (×1)', name_en: 'Papaya (×1)', name_am: 'ፓፓያ (×1)' },
    { name: 'Guava (×3)', name_en: 'Guava (×3)', name_am: 'ዘይቱን (×3)' },
    { name: 'Spinach (2 bunches)', name_en: 'Spinach (2 bunches)', name_am: 'ስፒናች (2 ዕምቅ)' },
    { name: 'Gomen (collard greens, 1 bunch)', name_en: 'Gomen (collard greens, 1 bunch)', name_am: 'ጎመን (1 ዕምቅ)' },
    { name: 'Tikel gomen (cabbage, ×1 head)', name_en: 'Tikel gomen (cabbage, ×1 head)', name_am: 'ጥቅል ጎመን (×1)' },
    { name: 'Tomatoes (×5)', name_en: 'Tomatoes (×5)', name_am: 'ቲማቲም (×5)' },
    { name: 'Carrots (×4)', name_en: 'Carrots (×4)', name_am: 'ካሮት (×4)' },
    { name: 'Onions (×3)', name_en: 'Onions (×3)', name_am: 'ቀይ ሽንኩርት (×3)' },
    { name: 'Beetroot (×3)', name_en: 'Beetroot (×3)', name_am: 'ቀይ ሥር (×3)' },
    { name: 'Fosolia (green beans, 300g)', name_en: 'Fosolia (green beans, 300g)', name_am: 'ፎሶሊያ (300 ግ.)' },
  ],
  Other: [
    { name: 'Berbere spice (50g)', name_en: 'Berbere spice (50g)', name_am: 'በርበሬ (50 ግ.)' },
    { name: 'Water (2L bottles ×4)', name_en: 'Water (2L bottles ×4)', name_am: 'ውሃ (2 ሊ. ×4 ጠርሙስ)' },
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
    name_am: 'የክብደት መጨመር አስቤዛ',
    description: 'Ingredients for ~3 200 kcal/day — high-protein, high-carb Ethiopian foods for muscle building.',
    description_am: 'ለ~3,200 ኪ.ካ./ቀን — ጡንቻ ለመገንባት ከፍተኛ ፕሮቲን ያለው የኢትዮጵያ ምግብ ቁሳቁስ።',
    targetGoals: ['muscle', 'strength'],
    targetBmiCategories: ['underweight'],
  },
  {
    id: 'weight-loss',
    name: 'Weight Loss Shopping List',
    name_am: 'የክብደት መቀነስ አስቤዛ',
    description: 'Ingredients for ~1 700 kcal/day — lean proteins and fibre-rich Ethiopian foods for fat loss.',
    description_am: 'ለ~1,700 ኪ.ካ./ቀን — ስብ ለመቀነስ ቀጭን ፕሮቲን እና ፋይበር የበዛው የኢትዮጵያ ምግብ ቁሳቁስ።',
    targetGoals: ['fat'],
    targetBmiCategories: ['overweight', 'obese'],
  },
]

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

export function buildPresetShoppingList(presetId) {
  if (presetId === 'weight-gain') return stampIds(WEIGHT_GAIN_SHOPPING)
  if (presetId === 'weight-loss') return stampIds(WEIGHT_LOSS_SHOPPING)
  return null
}

export function getRecommendedShoppingListId(bmiCategory, profileGoal) {
  for (const p of PRESET_SHOPPING_LISTS) {
    if (bmiCategory && p.targetBmiCategories.includes(bmiCategory)) return p.id
  }
  for (const p of PRESET_SHOPPING_LISTS) {
    if (profileGoal && p.targetGoals.includes(profileGoal)) return p.id
  }
  return null
}

/**
 * Return the localized name/description for a shopping list preset.
 */
export function localizedShoppingPreset(preset, locale) {
  if (locale === 'am') {
    return {
      name: preset.name_am || preset.name,
      description: preset.description_am || preset.description,
    }
  }
  return { name: preset.name, description: preset.description }
}
