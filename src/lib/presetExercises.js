import { EXERCISE_PHASE } from './exercisePhase'
import { buildExerciseTarget } from './exerciseFormat'
import {
  EXERCISE_CATEGORIES,
  CATEGORY_MUSCLE_GROUPS,
  TRAINING_SPLITS,
  EXERCISE_GOALS,
  FILTER_EQUIPMENT,
  DIFFICULTY_LEVELS,
  normalizeEquipment,
  normalizeMuscleGroup,
  collectFilterOptions,
  buildExerciseSearchHaystack,
  exerciseMatchesMuscle,
  exerciseMatchesSplit,
  exerciseMatchesGoal,
  exerciseMatchesLocation,
  sortExercises,
} from './exerciseTaxonomy'

const GYM_PRESET_NAMES = new Set([
  'Bench Press',
  'Chest Dip',
  'Cable Fly',
  'Pull-Up',
  'Chin-Up',
  'Lat Pulldown',
  'Seated Cable Row',
  'Deadlift',
  'Overhead Press',
  'Face Pull',
  'Upright Row',
  'Barbell Curl',
  'Preacher Curl',
  'Triceps Pushdown',
  'Close-Grip Bench Press',
  'Skull Crusher',
  'Barbell Back Squat',
  'Romanian Deadlift',
  'Leg Press',
  'Leg Extension',
  'Leg Curl',
  'Standing Calf Raise',
  'Hip Thrust',
  'Hack Squat',
  'Hanging Knee Raise',
  'Cable Crunch',
  'Thruster',
  'Cycling',
  'Rowing',
  'Stair Climber',
  'Swimming',
  'Assault Bike',
  'Dead Hang',
])

function inferPresetLocation(preset) {
  if (preset.location) return preset.location
  if (GYM_PRESET_NAMES.has(preset.name)) return 'Gym'
  const equipment = normalizeEquipment(preset.equipment)
  if (['Barbell', 'Cable', 'Machine'].includes(equipment)) return 'Gym'
  return 'Home'
}

export {
  EXERCISE_CATEGORIES,
  CATEGORY_MUSCLE_GROUPS,
  TRAINING_SPLITS,
  EXERCISE_GOALS,
  FILTER_EQUIPMENT as PRESET_EQUIPMENT_FILTER,
  DIFFICULTY_LEVELS,
}

const PRESET_EXERCISES = [
  // Strength — Chest (5)
  { name: 'Push-Up', category: 'Strength', muscleGroup: ['Chest', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Weight Loss', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '10-15', restTime: '60' },
  { name: 'Bench Press', category: 'Strength', muscleGroup: ['Chest', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-8', restTime: '90' },
  { name: 'Incline Dumbbell Press', category: 'Strength', muscleGroup: ['Chest', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '75' },
  { name: 'Chest Dip', category: 'Strength', muscleGroup: ['Chest', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '8-12', restTime: '75' },
  { name: 'Cable Fly', category: 'Strength', muscleGroup: ['Chest'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Cable', difficulty: 'Intermediate', sets: '3', reps: '10-12', restTime: '60' },
  // Strength — Back (6)
  { name: 'Pull-Up', category: 'Strength', muscleGroup: ['Back'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Advanced', sets: '3', reps: '5-8', restTime: '90' },
  { name: 'Chin-Up', category: 'Strength', muscleGroup: ['Back', 'Biceps'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Advanced', sets: '3', reps: '5-8', restTime: '90' },
  { name: 'Lat Pulldown', category: 'Strength', muscleGroup: ['Back'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '8-10', restTime: '75' },
  { name: 'Seated Cable Row', category: 'Strength', muscleGroup: ['Back'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '8-10', restTime: '75' },
  { name: 'One-Arm Dumbbell Row', category: 'Strength', muscleGroup: ['Back'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Intermediate', sets: '3', reps: '8-10 each', restTime: '75' },
  { name: 'Deadlift', category: 'Strength', muscleGroup: ['Back', 'Legs'], splits: ['Upper Body', 'Pull', 'Lower Body', 'Full Body'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Advanced', sets: '3', reps: '5', restTime: '120' },
  // Strength — Shoulders (5)
  { name: 'Overhead Press', category: 'Strength', muscleGroup: ['Shoulders', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '6-8', restTime: '90' },
  { name: 'Dumbbell Shoulder Press', category: 'Strength', muscleGroup: ['Shoulders', 'Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '8-10', restTime: '75' },
  { name: 'Lateral Raise', category: 'Strength', muscleGroup: ['Shoulders'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  { name: 'Face Pull', category: 'Strength', muscleGroup: ['Shoulders', 'Back'], splits: ['Upper Body', 'Pull'], goals: ['General Fitness', 'Strength'], equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  { name: 'Upright Row', category: 'Strength', muscleGroup: ['Shoulders'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '75' },
  // Strength — Biceps (4)
  { name: 'Dumbbell Curl', category: 'Strength', muscleGroup: ['Biceps'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '60' },
  { name: 'Hammer Curl', category: 'Strength', muscleGroup: ['Biceps'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '60' },
  { name: 'Barbell Curl', category: 'Strength', muscleGroup: ['Biceps'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '60' },
  { name: 'Preacher Curl', category: 'Strength', muscleGroup: ['Biceps'], splits: ['Upper Body', 'Pull'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Machine', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '60' },
  // Strength — Triceps (4)
  { name: 'Triceps Pushdown', category: 'Strength', muscleGroup: ['Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '60' },
  { name: 'Overhead Triceps Extension', category: 'Strength', muscleGroup: ['Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '60' },
  { name: 'Close-Grip Bench Press', category: 'Strength', muscleGroup: ['Triceps', 'Chest'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '75' },
  { name: 'Skull Crusher', category: 'Strength', muscleGroup: ['Triceps'], splits: ['Upper Body', 'Push'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '75' },
  // Strength — Legs (12)
  { name: 'Bodyweight Squat', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Weight Loss', 'General Fitness', 'Muscle Gain'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '15-20', restTime: '60' },
  { name: 'Goblet Squat', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '75' },
  { name: 'Barbell Back Squat', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '4', reps: '6-8', restTime: '120' },
  { name: 'Romanian Deadlift', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs', 'Pull'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '90' },
  { name: 'Leg Press', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '10-12', restTime: '90' },
  { name: 'Walking Lunge', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'General Fitness', 'Weight Loss'], equipment: 'Dumbbell', difficulty: 'Beginner', sets: '3', reps: '10 each', restTime: '75' },
  { name: 'Bulgarian Split Squat', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Dumbbell', difficulty: 'Intermediate', sets: '3', reps: '8 each', restTime: '75' },
  { name: 'Leg Extension', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  { name: 'Leg Curl', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  { name: 'Standing Calf Raise', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Machine', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  { name: 'Hip Thrust', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-12', restTime: '90' },
  { name: 'Hack Squat', category: 'Strength', muscleGroup: ['Legs'], splits: ['Lower Body', 'Legs'], goals: ['Muscle Gain', 'Strength', 'General Fitness'], equipment: 'Machine', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '90' },
  // Strength — Core (5)
  { name: 'Plank', category: 'Strength', muscleGroup: ['Core'], splits: ['Full Body'], goals: ['General Fitness', 'Strength', 'Weight Loss'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '', isTimeBased: true, duration: '45', durationUnit: 'seconds', restTime: '45' },
  { name: 'Side Plank', category: 'Strength', muscleGroup: ['Core'], splits: ['Full Body'], goals: ['General Fitness', 'Strength'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '', isTimeBased: true, duration: '30', durationUnit: 'seconds', restTime: '45' },
  { name: 'Hanging Knee Raise', category: 'Strength', muscleGroup: ['Core'], splits: ['Full Body'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '10-12', restTime: '60' },
  { name: 'Dead Bug', category: 'Strength', muscleGroup: ['Core'], splits: ['Full Body'], goals: ['General Fitness', 'Mobility'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '10 each', restTime: '45' },
  { name: 'Cable Crunch', category: 'Strength', muscleGroup: ['Core'], splits: ['Full Body'], goals: ['Muscle Gain', 'General Fitness'], equipment: 'Cable', difficulty: 'Beginner', sets: '3', reps: '12-15', restTime: '60' },
  // Strength — Full Body (4)
  { name: 'Kettlebell Swing', category: 'Strength', muscleGroup: ['Full Body', 'Legs'], splits: ['Full Body'], goals: ['Weight Loss', 'Strength', 'General Fitness'], equipment: 'Kettlebell', difficulty: 'Intermediate', sets: '3', reps: '15', restTime: '75' },
  { name: 'Burpee', category: 'Strength', muscleGroup: ['Full Body'], splits: ['Full Body'], goals: ['Weight Loss', 'General Fitness', 'Strength'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '75' },
  { name: "Farmer's Carry", category: 'Strength', muscleGroup: ['Full Body'], splits: ['Full Body'], goals: ['Strength', 'General Fitness', 'Muscle Gain'], equipment: 'Dumbbell', difficulty: 'Intermediate', sets: '3', reps: '', isTimeBased: true, duration: '40', durationUnit: 'seconds', restTime: '60' },
  { name: 'Thruster', category: 'Strength', muscleGroup: ['Full Body', 'Legs', 'Shoulders'], splits: ['Full Body'], goals: ['Weight Loss', 'Strength', 'General Fitness'], equipment: 'Barbell', difficulty: 'Intermediate', sets: '3', reps: '8-10', restTime: '90' },
  // Cardio (8)
  { name: 'Walking', category: 'Cardio', muscleGroup: ['Running'], splits: ['Full Body'], goals: ['Weight Loss', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '1', reps: '', isTimeBased: true, duration: '20', durationUnit: 'minutes', restTime: '0' },
  { name: 'Running', category: 'Cardio', muscleGroup: ['Running'], splits: ['Full Body'], goals: ['Weight Loss', 'General Fitness', 'Strength'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '1', reps: '', isTimeBased: true, duration: '20', durationUnit: 'minutes', restTime: '0' },
  { name: 'Cycling', category: 'Cardio', muscleGroup: ['Cycling'], splits: ['Lower Body', 'Full Body'], goals: ['Weight Loss', 'General Fitness'], equipment: 'Machine', difficulty: 'Beginner', sets: '1', reps: '', isTimeBased: true, duration: '20', durationUnit: 'minutes', restTime: '0' },
  { name: 'Jump Rope', category: 'Cardio', muscleGroup: ['Running'], splits: ['Full Body'], goals: ['Weight Loss', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '3', reps: '', isTimeBased: true, duration: '60', durationUnit: 'seconds', restTime: '45' },
  { name: 'Rowing', category: 'Cardio', muscleGroup: ['Rowing'], splits: ['Full Body', 'Pull'], goals: ['Weight Loss', 'General Fitness', 'Strength'], equipment: 'Machine', difficulty: 'Intermediate', sets: '1', reps: '', isTimeBased: true, duration: '15', durationUnit: 'minutes', restTime: '0' },
  { name: 'Stair Climber', category: 'Cardio', muscleGroup: ['Running'], splits: ['Lower Body', 'Full Body'], goals: ['Weight Loss', 'General Fitness'], equipment: 'Machine', difficulty: 'Intermediate', sets: '1', reps: '', isTimeBased: true, duration: '15', durationUnit: 'minutes', restTime: '0' },
  { name: 'Swimming', category: 'Cardio', muscleGroup: ['Rowing'], splits: ['Full Body'], goals: ['Weight Loss', 'General Fitness', 'Strength'], equipment: 'Bodyweight', difficulty: 'Intermediate', sets: '1', reps: '', isTimeBased: true, duration: '20', durationUnit: 'minutes', restTime: '0' },
  { name: 'Assault Bike', category: 'Cardio', muscleGroup: ['Cycling'], splits: ['Full Body', 'Lower Body'], goals: ['Weight Loss', 'General Fitness', 'Strength'], equipment: 'Machine', difficulty: 'Intermediate', sets: '1', reps: '', isTimeBased: true, duration: '15', durationUnit: 'minutes', restTime: '0' },
  // Mobility (7)
  { name: 'Dead Hang', category: 'Mobility', muscleGroup: ['Shoulders', 'Back'], splits: ['Upper Body', 'Pull'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '3', reps: '', isTimeBased: true, duration: '30', durationUnit: 'seconds', restTime: '45' },
  { name: 'Cat-Cow Stretch', category: 'Mobility', muscleGroup: ['Spine', 'Back'], splits: ['Full Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '10', restTime: '30' },
  { name: 'Hip Flexor Stretch', category: 'Mobility', muscleGroup: ['Hips'], splits: ['Lower Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '', isTimeBased: true, duration: '45', durationUnit: 'seconds', restTime: '30' },
  { name: "World's Greatest Stretch", category: 'Mobility', muscleGroup: ['Hips'], splits: ['Full Body', 'Lower Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '5 each', restTime: '30' },
  { name: 'Thoracic Rotation', category: 'Mobility', muscleGroup: ['Spine', 'Back'], splits: ['Upper Body', 'Full Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '8 each', restTime: '30' },
  { name: 'Couch Stretch', category: 'Mobility', muscleGroup: ['Hips'], splits: ['Lower Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '', isTimeBased: true, duration: '45', durationUnit: 'seconds', restTime: '30' },
  { name: 'Deep Squat Hold', category: 'Mobility', muscleGroup: ['Hips', 'Legs'], splits: ['Lower Body', 'Full Body'], goals: ['Mobility', 'General Fitness'], equipment: 'Bodyweight', difficulty: 'Beginner', sets: '2', reps: '', isTimeBased: true, duration: '60', durationUnit: 'seconds', restTime: '30' },
]

export function getPresetExercises() {
  return PRESET_EXERCISES.map((preset, index) => ({
    ...preset,
    equipment: normalizeEquipment(preset.equipment),
    location: inferPresetLocation(preset),
    id: `preset-${index}`,
  }))
}

function libraryKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function isPresetInLibrary(presetName, customExercises) {
  const key = libraryKey(presetName)
  return (customExercises || []).some((ex) => libraryKey(ex.name) === key)
}

export function presetToLibraryExercise(preset, baseTime = Date.now(), index = 0) {
  const isTimeBased = Boolean(preset.isTimeBased)
  const parsed = {
    sets: preset.sets || '3',
    reps: preset.reps || '10',
    isTimeBased,
    duration: preset.duration || '30',
    durationUnit: preset.durationUnit || 'seconds',
    restTime: preset.restTime || '60',
  }
  const target = buildExerciseTarget(parsed)
  const muscleGroup = normalizeMuscleGroup(preset)
  const equipment = normalizeEquipment(preset.equipment)

  return {
    id: `lib-${libraryKey(preset.name).replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${baseTime + index}`,
    name: preset.name,
    exercisePhase: EXERCISE_PHASE.MAIN,
    sets: parsed.sets,
    reps: parsed.reps,
    isTimeBased,
    duration: parsed.duration,
    durationUnit: parsed.durationUnit,
    restTime: parsed.restTime,
    equipment,
    difficulty: preset.difficulty || 'Beginner',
    muscleGroup,
    muscleGroups: muscleGroup,
    splits: preset.splits || [],
    goals: preset.goals || [],
    category: preset.category || 'Strength',
    location: inferPresetLocation(preset),
    imageUrl: '',
    instructions: '',
    tips: '',
    description: '',
    target,
    createdAt: baseTime + index,
  }
}

export function addPresetsToLibrary(customExercises, presets, baseTime = Date.now()) {
  const existing = [...(customExercises || [])]
  const existingKeys = new Set(existing.map((ex) => libraryKey(ex.name)))
  let index = 0
  const added = []

  presets.forEach((preset) => {
    const key = libraryKey(preset.name)
    if (existingKeys.has(key)) return
    const exercise = presetToLibraryExercise(preset, baseTime, index)
    existing.push(exercise)
    existingKeys.add(key)
    added.push(exercise)
    index += 1
  })

  return { customExercises: existing, added }
}

export function filterPresetExercises(
  presets,
  {
    searchQuery = '',
    categoryFilter = '',
    muscleFilter = '',
    splitFilter = '',
    goalFilter = '',
    equipmentFilter = '',
    difficultyFilter = '',
    locationFilter = '',
    sortBy = 'name',
  } = {}
) {
  let list = [...(presets || [])]

  const q = searchQuery.trim().toLowerCase()
  if (q) {
    list = list.filter((ex) => buildExerciseSearchHaystack(ex).includes(q))
  }

  if (categoryFilter) list = list.filter((ex) => ex.category === categoryFilter)
  if (muscleFilter) list = list.filter((ex) => exerciseMatchesMuscle(ex, muscleFilter))
  if (splitFilter) list = list.filter((ex) => exerciseMatchesSplit(ex, splitFilter))
  if (goalFilter) list = list.filter((ex) => exerciseMatchesGoal(ex, goalFilter))
  if (equipmentFilter) {
    list = list.filter((ex) => normalizeEquipment(ex.equipment) === equipmentFilter)
  }
  if (difficultyFilter) list = list.filter((ex) => ex.difficulty === difficultyFilter)
  if (locationFilter) list = list.filter((ex) => exerciseMatchesLocation(ex, locationFilter))

  return sortExercises(list, sortBy)
}

export function getPresetFilterOptions(presets, options = {}) {
  return collectFilterOptions(presets, options)
}

export function getMuscleGroupsForCategory(category) {
  return CATEGORY_MUSCLE_GROUPS[category] || []
}
