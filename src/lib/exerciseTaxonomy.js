/** Canonical exercise taxonomy for presets, library, and filters. */

export const EXERCISE_CATEGORIES = ['Strength', 'Cardio', 'Mobility']

export const STRENGTH_MUSCLE_CHIPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
  'Full Body',
]

/** @deprecated use STRENGTH_MUSCLE_CHIPS */
export const STRENGTH_MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
]

export const CATEGORY_MUSCLE_CHIPS = {
  Strength: STRENGTH_MUSCLE_CHIPS,
  Cardio: ['Running', 'Cycling', 'Rowing'],
  Mobility: ['Hips', 'Shoulders', 'Spine'],
}

/** @deprecated use CATEGORY_MUSCLE_CHIPS */
export const CATEGORY_MUSCLE_GROUPS = {
  Strength: STRENGTH_MUSCLE_GROUPS,
  Cardio: ['Running', 'Cycling', 'Rowing'],
  Mobility: ['Hips', 'Shoulders', 'Spine'],
}

export const MUSCLE_CHIP_ALIASES = {}

export const EXERCISE_LOCATIONS = ['Gym', 'Home']

/** Equipment options shown in preset library secondary filter. */
export const PRESET_FILTER_EQUIPMENT = [
  'Bodyweight',
  'Dumbbell',
  'Barbell',
  'Machine',
  'Cable',
]

export const TRAINING_SPLITS = [
  'Upper Body',
  'Lower Body',
  'Push',
  'Pull',
  'Legs',
  'Full Body',
]

export const EXERCISE_GOALS = [
  'Muscle Gain',
  'Strength',
  'Weight Loss',
  'General Fitness',
  'Mobility',
]

export const FILTER_EQUIPMENT = [
  'Bodyweight',
  'Dumbbell',
  'Barbell',
  'Cable',
  'Machine',
  'Kettlebell',
]

export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export const MUSCLE_FILTER_EXCLUDED = []

/**
 * Smart focus map per category — muscle/focus picks preview body region + splits.
 * primarySplit auto-applies when the muscle is selected.
 */
export const MUSCLE_FOCUS_MAP = {
  Strength: {
    Chest: { bodyRegion: 'Upper Body', primarySplit: 'Upper Body', splits: ['Upper Body', 'Push'] },
    Back: { bodyRegion: 'Upper Body', primarySplit: 'Upper Body', splits: ['Upper Body', 'Pull'] },
    Shoulders: {
      bodyRegion: 'Upper Body',
      primarySplit: 'Upper Body',
      splits: ['Upper Body', 'Push', 'Pull'],
    },
    Biceps: { bodyRegion: 'Upper Body', primarySplit: 'Upper Body', splits: ['Upper Body', 'Pull'] },
    Triceps: { bodyRegion: 'Upper Body', primarySplit: 'Upper Body', splits: ['Upper Body', 'Push'] },
    'Full Body': { bodyRegion: 'Full Body', primarySplit: 'Full Body', splits: ['Full Body'] },
    Legs: { bodyRegion: 'Lower Body', primarySplit: 'Lower Body', splits: ['Lower Body', 'Legs'] },
    Core: { bodyRegion: 'Full Body', primarySplit: 'Full Body', splits: ['Full Body'] },
  },
  Cardio: {
    Running: { bodyRegion: 'Full Body', primarySplit: 'Full Body', splits: ['Full Body'] },
    Cycling: {
      bodyRegion: 'Lower Body',
      primarySplit: 'Lower Body',
      splits: ['Lower Body', 'Full Body'],
    },
    Rowing: { bodyRegion: 'Full Body', primarySplit: 'Full Body', splits: ['Full Body', 'Pull'] },
  },
  Mobility: {
    Hips: { bodyRegion: 'Lower Body', primarySplit: 'Lower Body', splits: ['Lower Body', 'Full Body'] },
    Shoulders: { bodyRegion: 'Upper Body', primarySplit: 'Upper Body', splits: ['Upper Body'] },
    Spine: { bodyRegion: 'Full Body', primarySplit: 'Full Body', splits: ['Full Body'] },
  },
}

/** @deprecated use MUSCLE_FOCUS_MAP */
export const MUSCLE_SPLIT_HINTS = Object.fromEntries(
  Object.entries(MUSCLE_FOCUS_MAP.Strength).map(([muscle, focus]) => [muscle, focus.splits])
)

export function getMuscleFocusPreview(categoryFilter, muscleFilter) {
  if (!muscleFilter) return null
  const category = categoryFilter || 'Strength'
  const focus = MUSCLE_FOCUS_MAP[category]?.[muscleFilter]
  if (!focus) return null
  return { category, muscle: muscleFilter, ...focus }
}

export function isSplitCompatibleWithMuscle(muscleFilter, splitFilter, categoryFilter = 'Strength') {
  if (!muscleFilter || !splitFilter) return true
  const focus = MUSCLE_FOCUS_MAP[categoryFilter || 'Strength']?.[muscleFilter]
  if (!focus) return true
  return focus.splits.includes(splitFilter)
}

export function getSplitsForMuscle(muscleFilter, categoryFilter = '') {
  const focus = getMuscleFocusPreview(categoryFilter, muscleFilter)
  return focus?.splits || TRAINING_SPLITS
}

export function getPrimarySplitForMuscle(muscleFilter, categoryFilter = '') {
  const focus = getMuscleFocusPreview(categoryFilter || 'Strength', muscleFilter)
  return focus?.primarySplit || ''
}

const EQUIPMENT_ALIASES = {
  'Cardio Machine': 'Machine',
  'Jump Rope': 'Bodyweight',
  'Resistance Band': 'Bodyweight',
}

export function normalizeEquipment(value) {
  if (!value) return ''
  return EQUIPMENT_ALIASES[value] || value
}

export function normalizeMuscleGroup(exercise) {
  if (Array.isArray(exercise?.muscleGroup)) return exercise.muscleGroup
  if (typeof exercise?.muscleGroup === 'string' && exercise.muscleGroup) {
    return [exercise.muscleGroup]
  }
  return exercise?.muscleGroups || []
}

export function exerciseMatchesMuscle(exercise, muscleFilter) {
  if (!muscleFilter) return true
  const groups = normalizeMuscleGroup(exercise)
  const aliases = MUSCLE_CHIP_ALIASES[muscleFilter]
  if (aliases) return groups.some((g) => aliases.includes(g))
  return groups.includes(muscleFilter)
}

export function exerciseMatchesSplit(exercise, splitFilter) {
  if (!splitFilter) return true
  return (exercise?.splits || []).includes(splitFilter)
}

export function exerciseMatchesGoal(exercise, goalFilter) {
  if (!goalFilter) return true
  return (exercise?.goals || []).includes(goalFilter)
}

export function exerciseMatchesLocation(exercise, locationFilter) {
  if (!locationFilter) return true
  return exercise?.location === locationFilter
}

function orderedSort(values, order) {
  return [...values].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function normalizeMuscleChip(muscle) {
  return muscle
}

export function toMuscleFilterOptions(muscles, categoryFilter = '') {
  const allowed = categoryFilter
    ? CATEGORY_MUSCLE_CHIPS[categoryFilter] || []
    : STRENGTH_MUSCLE_CHIPS

  const normalized = new Set()
  ;(muscles || []).forEach((m) => {
    if (MUSCLE_FILTER_EXCLUDED.includes(m)) return
    const chip = normalizeMuscleChip(m)
    if (allowed.includes(chip)) normalized.add(chip)
  })

  return orderedSort([...normalized], allowed)
}

export function buildExerciseSearchHaystack(exercise) {
  return [
    exercise.name,
    exercise.category,
    exercise.equipment,
    exercise.difficulty,
    exercise.location,
    exercise.description,
    ...normalizeMuscleGroup(exercise),
    ...(exercise.splits || []),
    ...(exercise.goals || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function collectFilterOptions(
  exercises,
  { categoryFilter = '', muscleFilter = '' } = {}
) {
  const categories = new Set()
  const muscles = new Set()
  const splits = new Set()
  const goals = new Set()
  const equipment = new Set()
  const difficulties = new Set()
  const locations = new Set()

  ;(exercises || []).forEach((ex) => {
    if (categoryFilter && ex.category !== categoryFilter) return
    if (muscleFilter && !exerciseMatchesMuscle(ex, muscleFilter)) return
    if (ex.category) categories.add(ex.category)
    normalizeMuscleGroup(ex).forEach((m) => muscles.add(m))
    ;(ex.splits || []).forEach((s) => splits.add(s))
    ;(ex.goals || []).forEach((g) => goals.add(g))
    const eq = normalizeEquipment(ex.equipment)
    if (eq) equipment.add(eq)
    if (ex.difficulty) difficulties.add(ex.difficulty)
    if (ex.location) locations.add(ex.location)
  })

  let splitList = orderedSort(splits, TRAINING_SPLITS)
  const focus = getMuscleFocusPreview(categoryFilter, muscleFilter)
  if (focus) {
    splitList = splitList.filter((s) => focus.splits.includes(s))
    if (!splitList.length) splitList = [...focus.splits]
  }

  return {
    categories: orderedSort(categories, EXERCISE_CATEGORIES),
    muscles: toMuscleFilterOptions([...muscles], categoryFilter),
    splits: splitList,
    goals: orderedSort(goals, EXERCISE_GOALS),
    equipment: orderedSort(equipment, FILTER_EQUIPMENT),
    difficulties: orderedSort(difficulties, DIFFICULTY_LEVELS),
    locations: orderedSort(locations, EXERCISE_LOCATIONS),
  }
}

export function getPrimaryMuscleGroup(exercise) {
  const groups = normalizeMuscleGroup(exercise)
  if (groups.includes('Full Body') && groups.length === 1) return 'Full Body'
  const primary = groups.find((m) => m !== 'Full Body') || groups[0] || ''
  return primary
}

export function groupExercisesByCategoryMuscle(exercises) {
  const groups = new Map()

  ;(exercises || []).forEach((exercise) => {
    const category = exercise.category || 'Strength'
    const muscle = getPrimaryMuscleGroup(exercise)
    const key = `${category}::${muscle}`
    if (!groups.has(key)) {
      groups.set(key, { category, muscle, exercises: [] })
    }
    groups.get(key).exercises.push(exercise)
  })

  const categoryOrder = EXERCISE_CATEGORIES
  return [...groups.values()].sort((a, b) => {
    const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    if (catDiff !== 0) return catDiff
    const muscleOrder = CATEGORY_MUSCLE_CHIPS[a.category] || STRENGTH_MUSCLE_CHIPS
    return muscleOrder.indexOf(a.muscle) - muscleOrder.indexOf(b.muscle)
  })
}

export function sortExercises(exercises, sortBy = 'name') {
  const list = [...(exercises || [])]
  if (sortBy === 'difficulty') {
    return list.sort(
      (a, b) =>
        DIFFICULTY_LEVELS.indexOf(a.difficulty) - DIFFICULTY_LEVELS.indexOf(b.difficulty)
    )
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
}
