import i18n from '@/i18n'
import { EQUIPMENT_I18N_KEYS, MUSCLE_I18N_KEYS } from './i18nHelpers'

const DIFFICULTY_KEYS = ['beginner', 'intermediate', 'advanced']

const CATEGORY_KEYS = {
  Strength: 'exerciseCategories.strength',
  Cardio: 'exerciseCategories.cardio',
  Mobility: 'exerciseCategories.mobility',
}

const SPLIT_KEYS = {
  'Upper Body': 'trainingSplits.upperBody',
  'Lower Body': 'trainingSplits.lowerBody',
  Push: 'trainingSplits.push',
  Pull: 'trainingSplits.pull',
  Legs: 'trainingSplits.legs',
  'Full Body': 'trainingSplits.fullBody',
}

const GOAL_KEYS = {
  'Muscle Gain': 'exerciseGoals.muscleGain',
  Strength: 'exerciseGoals.strength',
  'Weight Loss': 'exerciseGoals.weightLoss',
  'General Fitness': 'exerciseGoals.generalFitness',
  Mobility: 'exerciseGoals.mobility',
}

const PRESET_MUSCLE_KEYS = {
  Running: 'presetMuscles.running',
  Cycling: 'presetMuscles.cycling',
  Rowing: 'presetMuscles.rowing',
  Hips: 'presetMuscles.hips',
  Spine: 'presetMuscles.spine',
}

function findEquipmentKey(englishValue) {
  return EQUIPMENT_I18N_KEYS.find(
    (key) => i18n.t(`equipment.${key}`, { lng: 'en' }) === englishValue
  )
}

function findMuscleKey(englishValue) {
  return MUSCLE_I18N_KEYS.find(
    (key) => i18n.t(`muscles.${key}`, { lng: 'en' }) === englishValue
  )
}

export function displayEquipment(value, t) {
  const key = findEquipmentKey(value)
  return key ? t(`equipment.${key}`) : value
}

export function displayMuscle(value, t) {
  const presetKey = PRESET_MUSCLE_KEYS[value]
  if (presetKey) return t(presetKey)
  const key = findMuscleKey(value)
  return key ? t(`muscles.${key}`) : value
}

export function displayCategory(value, t) {
  const key = CATEGORY_KEYS[value]
  return key ? t(key) : value
}

export function displaySplit(value, t) {
  const key = SPLIT_KEYS[value]
  return key ? t(key) : value
}

export function displayGoal(value, t) {
  const key = GOAL_KEYS[value]
  return key ? t(key) : value
}

export function displayDifficulty(value, t) {
  const key = DIFFICULTY_KEYS.find(
    (k) => i18n.t(`difficulty.${k}`, { lng: 'en' }) === value
  )
  return key ? t(`difficulty.${key}`) : value
}

export function displayLocation(value, t) {
  if (value === 'Gym') return t('exercises.locationGym')
  if (value === 'Home') return t('exercises.locationHome')
  return value
}

export function displayMuscleList(groups, t, limit = 3) {
  const list = (groups || []).slice(0, limit)
  return list.map((m) => displayMuscle(m, t)).join(', ')
}
