import {
  fetchExerciseRecommendation,
  fetchMealPlanRecommendation,
  fetchShoppingListRecommendation,
} from './aiRecommendations'
import { applyExerciseImport, IMPORT_MODE } from './exerciseImport'
import { applyMealPlanImport } from './mealPlanImport'
import { applyShoppingListImport } from './shoppingListImport'
import { buildPresetMealPlanDays, getRecommendedMealPlanId, PRESET_MEAL_PLANS } from './presetMealPlans'
import { buildPresetShoppingList, getRecommendedShoppingListId } from './presetShoppingLists'
import {
  buildPresetExercisePayload,
  defaultPresetDayMapping,
  getPresetTemplateById,
  getRecommendedWorkoutTemplateId,
  PRESET_TEMPLATES,
} from './presetTemplates'
import { calculateBmi, getBmiCategory, resolveEffectiveTrainingGoal } from './profileUtils'
import { hasAnyExercises, isMealPlanEmpty, isShoppingListEmpty } from './planEmpty'

export const PLAN_SETUP_METHOD = {
  AI: 'ai',
  TEMPLATE: 'template',
  MANUAL: 'manual',
}

export function getPlanSetupMethod(state) {
  const method = state?.planSetupMethod
  if (method === PLAN_SETUP_METHOD.AI) return PLAN_SETUP_METHOD.AI
  if (method === PLAN_SETUP_METHOD.TEMPLATE) return PLAN_SETUP_METHOD.TEMPLATE
  if (method === PLAN_SETUP_METHOD.MANUAL) return PLAN_SETUP_METHOD.MANUAL
  return null
}

/**
 * Visibility rules per setup method:
 *   ai       → template only (AI was already used at setup)
 *   template → nothing (both were used at setup — JSON only)
/**
 * AI and template features are always available — users can regenerate
 * their plan at any time regardless of how they set up initially.
 */
export function allowsAiPlanFeatures(state) {
  return true
}

export function allowsTemplatePlanFeatures(state) {
  return true
}

/**
 * For manual users, AI/template features are available in order:
 * exercises first → meal plan → shopping list.
 * For ai/template/legacy users the gate is always open (they already went through setup).
 */
export function canUseAiOrTemplateForMeals(state) {
  if (getPlanSetupMethod(state) !== PLAN_SETUP_METHOD.MANUAL) return true
  return hasAnyExercises(state)
}

export function canUseAiOrTemplateForShopping(state) {
  if (getPlanSetupMethod(state) !== PLAN_SETUP_METHOD.MANUAL) return true
  return !isMealPlanEmpty(state?.mealPlan)
}

function resolveMealPresetId(bmiCategory, profileGoal) {
  const id = getRecommendedMealPlanId(bmiCategory, profileGoal)
  if (id) return id
  return profileGoal === 'fat' ? 'weight-loss' : 'weight-gain'
}

function resolveShoppingPresetId(bmiCategory, profileGoal) {
  const id = getRecommendedShoppingListId(bmiCategory, profileGoal)
  if (id) return id
  return profileGoal === 'fat' ? 'weight-loss' : 'weight-gain'
}

/** Infer planSetupComplete for users upgrading from saves without the flag. */
export function inferPlanSetupComplete(state) {
  if (state?.planSetupComplete) return true
  return (
    hasAnyExercises(state) ||
    !isMealPlanEmpty(state?.mealPlan) ||
    !isShoppingListEmpty(state?.shoppingList)
  )
}

export function applyTemplatePlanSetup(state) {
  const profile = state.profile || {}
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  const bmiCategory = getBmiCategory(bmi)
  const goal = resolveEffectiveTrainingGoal(profile)

  const workoutId = getRecommendedWorkoutTemplateId(profile)
  const preset = getPresetTemplateById(workoutId) ?? PRESET_TEMPLATES[0]
  const mapping = defaultPresetDayMapping(preset, profile.workoutDays || [])
  const exercisePayload = buildPresetExercisePayload(preset, mapping)
  const exerciseResult = applyExerciseImport(state, exercisePayload, IMPORT_MODE.REPLACE_SCHEDULE)

  const mealId = resolveMealPresetId(bmiCategory, goal)
  const mealPreset = PRESET_MEAL_PLANS.find((p) => p.id === mealId)
  const mealPlan = mealPreset ? buildPresetMealPlanDays(mealPreset) : state.mealPlan

  const shoppingId = resolveShoppingPresetId(bmiCategory, goal)
  const shoppingList = buildPresetShoppingList(shoppingId) ?? state.shoppingList

  return {
    customExercises: exerciseResult.customExercises,
    workoutSchedule: exerciseResult.workoutSchedule,
    profile: exerciseResult.profile,
    mealPlan,
    shoppingList,
    planSetupComplete: true,
    planSetupMethod: PLAN_SETUP_METHOD.TEMPLATE,
  }
}

export async function applyAiPlanSetup(state, { onPhase } = {}) {
  onPhase?.('exercises')
  const exerciseParsed = await fetchExerciseRecommendation(state)
  const exerciseResult = applyExerciseImport(state, exerciseParsed, IMPORT_MODE.APPEND)

  const withExercises = {
    ...state,
    customExercises: exerciseResult.customExercises,
    workoutSchedule: exerciseResult.workoutSchedule,
    profile: exerciseResult.profile,
  }

  onPhase?.('meals')
  const mealParsed = await fetchMealPlanRecommendation(withExercises)
  const mealResult = applyMealPlanImport(withExercises, mealParsed, { replace: true })

  const withMeals = { ...withExercises, mealPlan: mealResult.mealPlan }

  onPhase?.('shopping')
  const shoppingParsed = await fetchShoppingListRecommendation(withMeals)
  const shoppingResult = applyShoppingListImport(withMeals, shoppingParsed, { replace: true })

  return {
    customExercises: exerciseResult.customExercises,
    workoutSchedule: exerciseResult.workoutSchedule,
    profile: exerciseResult.profile,
    mealPlan: mealResult.mealPlan,
    shoppingList: shoppingResult.shoppingList,
    planSetupComplete: true,
    planSetupMethod: PLAN_SETUP_METHOD.AI,
    exerciseWarnings: exerciseResult.warnings,
  }
}
