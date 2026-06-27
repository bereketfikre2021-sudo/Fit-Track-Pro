import { MEAL_SLOT_IDS } from './mealPlan'

/** True when the exercise library has no entries (schedule ignored). */
export function isExerciseLibraryEmpty(state) {
  return (state?.customExercises || []).length === 0
}

export function hasAnyExercises(state) {
  if ((state?.customExercises || []).length > 0) return true
  return Object.values(state?.workoutSchedule || {}).some(
    (day) => (day?.exercises || []).length > 0
  )
}

export function hasWorkoutDays(state) {
  return (state?.profile?.workoutDays || []).length > 0
}

/** Show new-user style AI + add-exercise prompts (no days or no exercises anywhere). */
export function shouldShowExerciseSetupPrompt(state) {
  return !hasWorkoutDays(state) || !hasAnyExercises(state)
}

export function isMealPlanEmpty(mealPlan) {
  if (!mealPlan || typeof mealPlan !== 'object') return true
  return !Object.values(mealPlan).some((dayMeals) =>
    MEAL_SLOT_IDS.some((slot) => (dayMeals?.[slot] || []).length > 0)
  )
}

export function isShoppingListEmpty(shoppingList) {
  if (!shoppingList || typeof shoppingList !== 'object') return true
  return !Object.values(shoppingList).some(
    (items) => Array.isArray(items) && items.length > 0
  )
}

/** True when onboarded user still needs the post-onboarding plan setup step. */
export function needsPlanSetup(state) {
  if (!state?.onboarded) return false
  return !state.planSetupComplete
}
