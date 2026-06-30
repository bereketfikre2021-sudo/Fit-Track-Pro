import { generateGeminiText } from './gemini'
import { MEAL_SLOT_IDS } from './mealPlan'
import { formatFocusArea } from './profileOptions'
import { getExerciseImportTemplate } from './exerciseImport'
import { getMealPlanImportTemplate } from './mealPlanImport'
import {
  DEFAULT_SHOPPING_CATEGORIES,
  getShoppingListTemplate,
} from './shoppingListImport'
import {
  calculateAgeFromBirthDate,
  calculateBmi,
  getBmiCategory,
  getWeightChangeInfo,
  resolveEffectiveTrainingGoal,
  resolveEffectiveFitnessLevel,
  suggestTargetWeightKg,
} from './profileUtils'
import { isMealPlanEmpty } from './planEmpty'

const GOAL_LABELS = {
  strength: 'Strength',
  muscle: 'Muscle building',
  fat: 'Fat loss',
  endurance: 'Endurance',
}

const BMI_CATEGORY_LABELS = {
  underweight: 'underweight',
  normal: 'normal (healthy)',
  overweight: 'overweight',
  obese: 'obese',
}

const GOAL_TRAINING_DIRECTIVES = {
  fat: `MANDATORY FAT-LOSS training rules (NOT muscle building or bulking):
- Primary outcome: burn calories, preserve muscle, support a moderate deficit
- Every training day: include 8–15 min conditioning/finisher (walk/jog intervals, bike, rower, jump rope, kettlebell swings, sled push, step-ups)
- Main lifts: moderate volume (2–4 sets), compound patterns; avoid bodybuilding-style high-volume hypertrophy blocks
- Do NOT prescribe "mass gain", "bulking", or aggressive progressive overload for size
- Day notes must reference fat loss / conditioning — never hypertrophy or bulking`,
  muscle: `MANDATORY MUSCLE-BUILDING training rules:
- Primary outcome: hypertrophy and strength with progressive overload
- Higher training volume on main lifts (3–5 sets), adequate rest between heavy sets
- Include compound lifts and accessory work for target muscles
- Support calorie surplus via training stimulus — avoid excessive cardio that interferes with recovery`,
  strength: `MANDATORY STRENGTH training rules:
- Primary outcome: maximal strength on key lifts with lower rep ranges (3–6) on compounds
- Moderate accessory volume; conditioning is light and optional
- Focus on technique and progressive load on squat/hinge/push/pull patterns`,
  endurance: `MANDATORY ENDURANCE training rules:
- Primary outcome: cardiovascular fitness and muscular endurance
- Include longer conditioning blocks, circuits, and higher-rep work
- Resistance training supports endurance (not heavy bulking volume)`,
}

const GOAL_MEAL_DIRECTIVES = {
  fat: `MANDATORY FAT-LOSS meal rules (NOT weight-gain or bulking):
- Moderate calorie deficit: high protein, controlled portions, limited added oils/sugars
- Lean proteins (eggs, chicken, legumes, fish if affordable), plenty of vegetables
- Avoid calorie-dense combos (large injera stacks, honey milk, excess oil) unless portion-controlled
- Daily totals should be BELOW maintenance to support losing weight`,
  muscle: `MANDATORY MUSCLE-GAIN meal rules:
- Calorie surplus with high protein across the day
- Larger portions on main meals; include starch staples (injera, rice, potatoes) and protein at every meal
- Snacks should add calories (eggs, milk, legumes, fruit with nuts)`,
  strength: `MANDATORY STRENGTH-SUPPORT meal rules:
- Balanced maintenance calories with adequate protein for recovery
- Sustaining portions — not aggressive deficit or surplus unless weight direction says otherwise`,
  endurance: `MANDATORY ENDURANCE meal rules:
- Carbohydrate-forward meals for training fuel; moderate protein
- Emphasize complex carbs (injera, potatoes, legumes) and hydration-friendly foods`,
}

const FAT_LOSS_MONDAY_MEAL_EXAMPLE = {
  breakfast: [
    { name: 'Boiled eggs (2) + tomato salad', calories: 180, protein: 14 },
    { name: 'Black coffee or tea', calories: 5, protein: 0 },
  ],
  morningSnack: [{ name: 'Orange or papaya', calories: 70, protein: 1 }],
  lunch: [
    { name: 'Injera with misir wot (small portion)', calories: 380, protein: 16 },
    { name: 'Gomen (collard greens)', calories: 90, protein: 4 },
  ],
  afternoonSnack: [{ name: 'Roasted chickpeas (kolo) — small handful', calories: 100, protein: 6 }],
  dinner: [
    { name: 'Grilled chicken tibs (lean) + salad', calories: 320, protein: 35 },
    { name: 'Atkilt (vegetables, light oil)', calories: 120, protein: 3 },
  ],
  beforeBed: [{ name: 'Herbal tea', calories: 0, protein: 0 }],
}

const MUSCLE_GAIN_MONDAY_MEAL_EXAMPLE = {
  breakfast: [
    { name: 'Genfo (teff porridge) + ayib', calories: 350, protein: 12 },
    { name: 'Boiled eggs (2)', calories: 140, protein: 12 },
  ],
  morningSnack: [{ name: 'Banana', calories: 105, protein: 1 }],
  lunch: [
    { name: 'Injera with shiro wot', calories: 520, protein: 18 },
    { name: 'Mixed atkilt (cabbage, carrot, potato)', calories: 180, protein: 4 },
  ],
  afternoonSnack: [{ name: 'Roasted chickpeas (kolo)', calories: 150, protein: 8 }],
  dinner: [
    { name: 'Grilled chicken tibs + injera', calories: 580, protein: 42 },
    { name: 'Gomen (collard greens)', calories: 90, protein: 4 },
  ],
  beforeBed: [{ name: 'Warm milk with honey', calories: 120, protein: 6 }],
}

/** Extract JSON object from model text (handles optional markdown fences). */
export function parseJsonFromModelText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('AI returned empty content')
  }

  let raw = text.trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    raw = fenced[1].trim()
  }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not contain valid JSON')
  }

  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    throw new Error('Could not parse AI response as JSON')
  }
}

function resolveTargetWeight(profile = {}) {
  const explicit = parseFloat(profile.targetWeight)
  if (explicit > 0) return explicit
  return suggestTargetWeightKg({
    heightCm: profile.height,
    gender: profile.gender || 'male',
  })
}

function buildWeightGoalContext(profile = {}) {
  const lines = []
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  if (bmi != null) {
    const category = getBmiCategory(bmi)
    lines.push(
      `BMI: ${bmi}${category ? ` (${BMI_CATEGORY_LABELS[category] || category})` : ''}`
    )
  }

  const targetWeight = resolveTargetWeight(profile)
  if (targetWeight) {
    lines.push(
      `Target weight: ${targetWeight} kg — PRIMARY weight goal; all meal portions and training volume must align with reaching this target`
    )

    const change = getWeightChangeInfo(profile.currentWeight, targetWeight)
    if (change) {
      if (change.direction === 'gain') {
        lines.push(
          `Weight direction: GAIN approximately ${change.absDelta} kg — use calorie surplus meals, higher protein, and hypertrophy/strength progression`
        )
      } else if (change.direction === 'lose') {
        lines.push(
          `Weight direction: LOSE approximately ${change.absDelta} kg — use moderate calorie deficit, high protein, and fat-loss training (resistance + conditioning)`
        )
      } else {
        lines.push(
          'Weight direction: MAINTAIN near target — focus on body recomposition, performance, and sustainable habits'
        )
      }
    }
  }

  return lines
}

const MAINTENANCE_MONDAY_MEAL_EXAMPLE = {
  breakfast: [
    { name: 'Boiled eggs (2) + injera (1)', calories: 280, protein: 14 },
    { name: 'Tomato & onion salad', calories: 45, protein: 1 },
  ],
  morningSnack: [{ name: 'Banana', calories: 105, protein: 1 }],
  lunch: [
    { name: 'Injera with shiro wot', calories: 450, protein: 16 },
    { name: 'Atkilt (mixed vegetables)', calories: 150, protein: 4 },
  ],
  afternoonSnack: [{ name: 'Roasted chickpeas (kolo)', calories: 120, protein: 6 }],
  dinner: [
    { name: 'Chicken tibs + gomen', calories: 420, protein: 32 },
    { name: 'Small injera', calories: 120, protein: 3 },
  ],
  beforeBed: [{ name: 'Warm milk', calories: 90, protein: 5 }],
}

function getMealExampleForGoal(goal) {
  if (goal === 'fat') return FAT_LOSS_MONDAY_MEAL_EXAMPLE
  if (goal === 'muscle') return MUSCLE_GAIN_MONDAY_MEAL_EXAMPLE
  return MAINTENANCE_MONDAY_MEAL_EXAMPLE
}

function buildUserContext(profile = {}) {
  const age = calculateAgeFromBirthDate(profile.birthDate)
  const effectiveGoal = resolveEffectiveTrainingGoal(profile)
  const profileGoalLabel = GOAL_LABELS[profile.goal] || profile.goal
  const effectiveGoalLabel = GOAL_LABELS[effectiveGoal] || effectiveGoal

  const lines = [
    `Name: ${profile.name || 'User'}`,
    `Training goal (authoritative — from BMI & body metrics): ${effectiveGoalLabel}`,
  ]

  if (profile.goal && profile.goal !== effectiveGoal) {
    lines.push(
      `Profile goal selection: ${profileGoalLabel} — IGNORE if it conflicts; follow Training goal above`
    )
  }

  lines.push(
    `Focus area: ${formatFocusArea(profile.focusArea)}`,
    `Fitness level: ${resolveEffectiveFitnessLevel(profile)}`,
    `Training days per week: ${(profile.workoutDays || []).join(', ') || 'not set'}`
  )

  if (profile.equipment?.length) {
    lines.push(`Available equipment: ${profile.equipment.join(', ')}`)
  }

  if (profile.gender) lines.push(`Gender: ${profile.gender}`)
  if (profile.currentWeight) lines.push(`Current weight: ${profile.currentWeight} kg`)
  if (profile.height) lines.push(`Height: ${profile.height} cm`)
  if (age != null) lines.push(`Age: ${age}`)

  lines.push(...buildWeightGoalContext(profile))
  lines.push('')
  lines.push(GOAL_TRAINING_DIRECTIVES[effectiveGoal] || GOAL_TRAINING_DIRECTIVES.strength)
  lines.push('')
  lines.push(GOAL_MEAL_DIRECTIVES[effectiveGoal] || GOAL_MEAL_DIRECTIVES.strength)

  return lines.join('\n')
}

export function getEffectiveGoalForAi(profile = {}) {
  return resolveEffectiveTrainingGoal(profile)
}

const EXERCISE_SYSTEM = `You are a certified strength coach. Output ONLY valid JSON matching the FitTrack Pro exercise import format. No markdown, no commentary outside JSON.

The "Training goal (authoritative)" field in the user profile is derived from BMI and weight trajectory — it overrides any conflicting profile selection. You MUST follow the MANDATORY training rules for that goal. Never output a muscle-gain/bulking program when the goal is Fat loss, and never output a fat-loss/cardio-only program when the goal is Muscle building.

Design complete, varied weekly programs — not minimal or repetitive lists. Use realistic exercise names, equipment, muscle groups, and prescriptions matched to the authoritative training goal, fitness level, and weight direction. Include warmup and cooldown on every training day.`

const MEAL_SYSTEM = `You are an Ethiopian meal planner and sports nutritionist. Output ONLY valid JSON for a weekly meal plan import. No markdown, no commentary outside JSON.

The "Training goal (authoritative)" field is derived from BMI and weight trajectory — follow the MANDATORY meal rules for that goal. For Fat loss: deficit portions, NOT bulking meals. For Muscle building: surplus portions. Never recommend weight-gain meals for a fat-loss user.

Every meal must use affordable, commonly available Ethiopian foods (home cooking and local markets in Addis Ababa and regional towns). Prefer: injera, firfir, tibs, shiro wot, misir wot, atkilt, gomen, doro wot (eggs), lean beef or chicken, lentils, chickpeas, teff porridge/genfo, boiled eggs, ayib, local fruit (banana, mango, papaya), tomatoes, onions, potatoes, cabbage.

Avoid expensive imports (protein powder, salmon, specialty cheeses, packaged Western diet foods) unless minimal. Use clear local dish names in food "name" fields. Provide realistic calories and protein (numbers).

Target weight and weight direction must align with the authoritative training goal — do not contradict them.`

const SHOPPING_SYSTEM = `You are an Ethiopian grocery and meal-prep planner. Output ONLY valid JSON for a shopping list import. No markdown, no commentary outside JSON. Items must be affordable and commonly found in Ethiopia (Addis markets, local shops, supermarkets). Prefer local staples: teff flour, injera, shiro powder, berbere, lentils (messir), chickpeas, eggs, chicken, beef (lean cuts), oil, onions, garlic, tomato, potato, cabbage, carrot, gomen, avocado, banana, milk/ayib, etc. Consolidate duplicates; weekly budget-conscious quantities in item names when helpful (e.g. "Teff flour 2 kg"). Each item: { "name": string, "checked": false }.`

function summarizeMealPlanForAi(mealPlan) {
  const summary = {}
  Object.entries(mealPlan || {}).forEach(([day, dayMeals]) => {
    const meals = []
    MEAL_SLOT_IDS.forEach((slot) => {
      ;(dayMeals?.[slot] || []).forEach((food) => {
        const name = String(food?.name || '').trim()
        if (!name) return
        meals.push({
          slot,
          name,
          calories: food.calories ?? null,
          protein: food.protein ?? null,
        })
      })
    })
    if (meals.length) summary[day] = meals
  })
  return summary
}

const FOCUS_AREA_MUSCLE_RULES = {
  'full-body': 'Each day must hit multiple muscle groups; across the week cover chest, back, shoulders, legs, glutes, core, and arms.',
  upper: 'Emphasize chest, back, shoulders, and arms; include supporting lower-body and core work.',
  lower: 'Emphasize quads, hamstrings, glutes, and calves; include supporting upper-body and core work.',
  core: 'Include dedicated core work every session plus balanced push/pull and leg patterns.',
}

export async function fetchExerciseRecommendation(state) {
  const profile = state?.profile || {}
  const effectiveGoal = resolveEffectiveTrainingGoal(profile)
  const template = getExerciseImportTemplate()
  const userSelectedDays = profile.workoutDays || []
  const hasUserDays = userSelectedDays.length > 0
  const focusRule =
    FOCUS_AREA_MUSCLE_RULES[profile.focusArea] || FOCUS_AREA_MUSCLE_RULES['full-body']

  const dayRequirement = hasUserDays
    ? `- Use exactly these workoutDays: ${JSON.stringify(userSelectedDays)}`
    : `- User did not pick training days: choose 3–5 optimal weekdays in "workoutDays" for their goal and level, then build the full schedule for those days`

  const userPrompt = `Create a personalized weekly workout import for this user.

User profile:
${buildUserContext(profile)}

Authoritative training goal for this plan: ${GOAL_LABELS[effectiveGoal] || effectiveGoal}

Requirements:
${dayRequirement}
- Populate "exercises" library with 18–28 UNIQUE exercises (enough variety for the full week)
- Each training day schedule entry: 5–8 exercises (warmup + main + cooldown) with distinct movement patterns
- Weekly movement coverage: include horizontal push, vertical push, horizontal pull, vertical pull, squat/knee-dominant, hinge/hip-dominant, core, and conditioning or carry work
- ${focusRule}
- Do NOT repeat the same main compound lift on consecutive days; rotate muscle emphasis across days
- Use at least 3 equipment types (e.g. Bodyweight, Dumbbell, Barbell, Cable, Kettlebell, Band, Machine); use ONLY equipment the user has listed if "Available equipment" is set in their profile
- Every exercise name in "schedule" must exist in the "exercises" library
- Each schedule day needs "note" and "exercises" array with { name, sets?, reps?, prescription? }
- Match exercisePhase: warmup, main, or cooldown
- difficulty: Beginner, Intermediate, or Advanced per user level
- STRICTLY follow the MANDATORY training rules for the authoritative goal above — fat loss MUST include conditioning; muscle building MUST NOT be replaced with a cutting program
- Align volume and intensity with the authoritative goal AND weight direction
- Avoid generic filler — choose specific, well-known exercise names (vary movements across the week)
- This import is self-contained: workoutDays, exercises, and schedule must all be included

Example structure (fill with real, varied content — do not copy these exact exercises):
${JSON.stringify(
    {
      workoutDays: hasUserDays ? userSelectedDays : template.workoutDays,
      exercises: template.exercises.slice(0, 2),
      schedule: template.schedule,
    },
    null,
    2
  )}

Return a complete JSON object with keys: version (2), workoutDays, exercises, schedule.`

  const text = await generateGeminiText({
    systemInstruction: EXERCISE_SYSTEM,
    userPrompt,
    temperature: 0.75,
  })

  const parsed = parseJsonFromModelText(text)
  if (!Array.isArray(parsed.exercises) && !parsed.schedule) {
    throw new Error('AI exercise plan is missing exercises or schedule')
  }
  return parsed
}

export async function fetchMealPlanRecommendation(state) {
  const profile = state?.profile || {}
  const effectiveGoal = resolveEffectiveTrainingGoal(profile)
  const template = getMealPlanImportTemplate()
  const mondayExample = getMealExampleForGoal(effectiveGoal)

  const userPrompt = `Create a personalized 7-day meal plan import for Ethiopia for this user.

User profile:
${buildUserContext(profile)}

Authoritative training goal for this plan: ${GOAL_LABELS[effectiveGoal] || effectiveGoal}

Requirements:
- Location & budget: Ethiopia — meals must be budget-friendly and use local staples (injera, wot/stews, legumes, eggs, chicken, teff, vegetables, seasonal fruit)
- Avoid Western-only meal plans; no default "Greek yogurt + salmon + protein shake" style unless replaced with local equivalents
- STRICTLY follow MANDATORY meal rules for the authoritative goal — fat loss = deficit portions; muscle building = surplus; do NOT cross these
- Target weight and weight direction must align with the authoritative training goal
- Return JSON with key "mealPlan" (or equivalent structure)
- Keys: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Each day: breakfast, morningSnack, lunch, afternoonSnack, dinner, beforeBed (arrays of foods)
- Each food: { name, calories (number), protein (number in grams) }
- Include 2–4 foods per main meal; snacks can be 1 item
- Vary dishes across the week (not the same lunch every day)
Example Monday for this user's goal (match calorie level and style for all days):
${JSON.stringify({ mealPlan: { Monday: mondayExample } }, null, 2)}

Return JSON: { "mealPlan": { ...all 7 days... } }`

  const text = await generateGeminiText({
    systemInstruction: MEAL_SYSTEM,
    userPrompt,
  })

  const parsed = parseJsonFromModelText(text)
  if (!parsed.mealPlan && !parsed.Monday) {
    throw new Error('AI meal plan is missing mealPlan data')
  }
  return parsed
}

export async function fetchShoppingListRecommendation(state) {
  const mealPlan = state?.mealPlan || {}
  if (isMealPlanEmpty(mealPlan)) {
    throw new Error('Add a weekly meal plan first, then generate your shopping list.')
  }

  const profile = state?.profile || {}
  const template = getShoppingListTemplate()
  const mealSummary = summarizeMealPlanForAi(mealPlan)
  const categories = DEFAULT_SHOPPING_CATEGORIES

  const userPrompt = `Build a weekly shopping list in Ethiopia based on this user's meal plan and profile.

User profile:
${buildUserContext(profile)}

Weekly meal plan (foods already planned):
${JSON.stringify(mealSummary, null, 2)}

Requirements:
- Derive grocery items needed to cook these meals for one week
- Budget-friendly; avoid imported luxury items unless essential
- Use categories exactly: ${JSON.stringify(categories)}
- 3–8 items per category where relevant; skip empty categories only if truly unnecessary
- Map generic meal items to Ethiopian market names (e.g. rice → rice, bread → dabo/injera as appropriate)
- Each item: { "name": string, "checked": false }
- Do not repeat the same ingredient across categories

Example shape:
${JSON.stringify({ shoppingList: template.shoppingList }, null, 2)}

Return JSON: { "shoppingList": { ${categories.map((c) => `"${c}": [...]`).join(', ')} } }`

  const text = await generateGeminiText({
    systemInstruction: SHOPPING_SYSTEM,
    userPrompt,
  })

  const parsed = parseJsonFromModelText(text)
  if (!parsed.shoppingList && !parsed['Protein Sources']) {
    throw new Error('AI shopping list is missing shoppingList data')
  }
  return parsed
}
