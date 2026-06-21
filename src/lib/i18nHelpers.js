import i18n from '@/i18n'

export const WEEKDAY_KEYS = {
  Monday: 'days.monday',
  Tuesday: 'days.tuesday',
  Wednesday: 'days.wednesday',
  Thursday: 'days.thursday',
  Friday: 'days.friday',
  Saturday: 'days.saturday',
  Sunday: 'days.sunday',
}

export const WEEKDAY_ABBREV_KEYS = {
  Monday: 'days.mon',
  Tuesday: 'days.tue',
  Wednesday: 'days.wed',
  Thursday: 'days.thu',
  Friday: 'days.fri',
  Saturday: 'days.sat',
  Sunday: 'days.sun',
}

export const EQUIPMENT_I18N_KEYS = [
  'abWheel',
  'barbell',
  'bench',
  'bodyweight',
  'box',
  'battleRopes',
  'cable',
  'cardioMachine',
  'dipStation',
  'dumbbell',
  'ezBar',
  'foamRoller',
  'jumpRope',
  'kettlebell',
  'landmine',
  'machine',
  'medicineBall',
  'pullUpBar',
  'resistanceBand',
  'rope',
  'sandbag',
  'sled',
  'smithMachine',
  'stabilityBall',
  'trx',
  'weightPlate',
  'other',
]

export const MUSCLE_I18N_KEYS = [
  'chest',
  'back',
  'lats',
  'traps',
  'rhomboids',
  'shoulders',
  'rotatorCuff',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'core',
  'lowerBack',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'hipFlexors',
  'adductors',
  'abductors',
  'neck',
  'fullBody',
  'cardio',
]

export function translateWeekday(day) {
  const key = WEEKDAY_KEYS[day]
  return key ? i18n.t(key) : day
}

export function translateWeekdayAbbrev(day) {
  const key = WEEKDAY_ABBREV_KEYS[day]
  return key ? i18n.t(key) : day
}

export function translateGoal(value) {
  return i18n.t(`goals.${value}`, { defaultValue: value })
}

export function translateFocusArea(value) {
  return i18n.t(`focusAreas.${value}`, { defaultValue: i18n.t('focusAreas.notSet') })
}

export function translateFitnessLevel(value) {
  return i18n.t(`fitnessLevel.${value}`, { defaultValue: value })
}

export function translateMealSlot(slotId) {
  return i18n.t(`mealSlots.${slotId}`, { defaultValue: slotId })
}

export function translateShoppingCategory(category) {
  const map = {
    'Protein Sources': 'shoppingCategories.protein',
    'Carb Sources': 'shoppingCategories.carb',
    'Healthy Fats': 'shoppingCategories.fats',
    'Fruits & Vegetables': 'shoppingCategories.produce',
    Other: 'shoppingCategories.other',
  }
  const key = map[category]
  return key ? i18n.t(key) : category
}

export function getEquipmentOptions() {
  return EQUIPMENT_I18N_KEYS.map((key) => i18n.t(`equipment.${key}`))
}

export function getMuscleGroupOptions() {
  return MUSCLE_I18N_KEYS.map((key) => i18n.t(`muscles.${key}`))
}

export function getDifficultyOptions() {
  return ['beginner', 'intermediate', 'advanced'].map((key) =>
    i18n.t(`difficulty.${key}`)
  )
}
