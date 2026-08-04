import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from './appSettings'
import { inferPlanSetupComplete } from './planSetup'

export const CURRENT_SCHEMA_VERSION = 2

const MAX_BACKUP_BYTES = 10 * 1024 * 1024

const MEAL_DAY_SLOTS = {
  breakfast: [],
  morningSnack: [],
  lunch: [],
  afternoonSnack: [],
  dinner: [],
  beforeBed: [],
}

const DEFAULT_MEAL_PLAN = {
  Monday: { ...MEAL_DAY_SLOTS },
  Tuesday: { ...MEAL_DAY_SLOTS },
  Wednesday: { ...MEAL_DAY_SLOTS },
  Thursday: { ...MEAL_DAY_SLOTS },
  Friday: { ...MEAL_DAY_SLOTS },
  Saturday: { ...MEAL_DAY_SLOTS },
  Sunday: { ...MEAL_DAY_SLOTS },
}

const DEFAULT_SHOPPING_LIST = {
  'Protein Sources': [],
  'Carb Sources': [],
  'Healthy Fats': [],
  'Fruits & Vegetables': [],
  Other: [],
}

/** Default app state factory (kept in sync with App.jsx). */
export function createDefaultAppState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    onboarded: false,
    planSetupComplete: false,
    planSetupMethod: null,
    profile: {
      name: '',
      registrationDate: '',
      birthDate: '',
      gender: 'male',
      currentWeight: '',
      height: '',
      targetWeight: '',
      avatarUrl: '',
      goal: 'muscle',
      focusArea: 'full-body',
      fitnessLevel: 'beginner',
      fitnessLevelManual: false,
      equipment: [],
      workoutDays: [],
      notes: '',
    },
    customExercises: [],
    workoutSchedule: {},
    mealPlan: structuredClone(DEFAULT_MEAL_PLAN),
    shoppingList: structuredClone(DEFAULT_SHOPPING_LIST),
    bodyLogs: [],
    waterLogs: {},
    workoutTemplates: [],
    completedSessions: [],
    completedExercises: {},
    activeWorkoutSession: null,
    // transferredWorkouts: { 'YYYY-MM-DD': { fromDay: 'Tuesday', toDay: 'Wednesday' } }
    // Stores one-time workout transfers so the schedule isn't permanently mutated.
    transferredWorkouts: {},
    appSettings: { ...DEFAULT_APP_SETTINGS },
  }
}

function mergeMealPlan(saved) {
  const base = structuredClone(DEFAULT_MEAL_PLAN)
  if (!saved || typeof saved !== 'object') return base
  for (const day of Object.keys(base)) {
    base[day] = { ...base[day], ...(saved[day] || {}) }
  }
  return base
}

function mergeShoppingList(saved) {
  const base = structuredClone(DEFAULT_SHOPPING_LIST)
  if (!saved || typeof saved !== 'object') return base
  const merged = { ...base, ...saved }
  const legacyProduce = [
    ...(Array.isArray(merged.Fruits) ? merged.Fruits : []),
    ...(Array.isArray(merged.Vegetables) ? merged.Vegetables : []),
  ]
  if (legacyProduce.length) {
    merged['Fruits & Vegetables'] = [
      ...(merged['Fruits & Vegetables'] || []),
      ...legacyProduce,
    ]
  }
  delete merged.Fruits
  delete merged.Vegetables
  return merged
}

/** Apply migrations from older saves (no schemaVersion or v1). */
export function migrateAppState(state, defaults = createDefaultAppState()) {
  const { logs: _removedLogs, ...rest } = state || {}
  const merged = {
    ...defaults,
    ...rest,
    profile: { ...defaults.profile, ...(state.profile || {}) },
    appSettings: normalizeAppSettings(state.appSettings ?? defaults.appSettings),
    mealPlan: mergeMealPlan(state.mealPlan),
    shoppingList: mergeShoppingList(state.shoppingList),
    customExercises: Array.isArray(state.customExercises) ? state.customExercises : [],
    workoutSchedule:
      state.workoutSchedule && typeof state.workoutSchedule === 'object'
        ? state.workoutSchedule
        : {},
    bodyLogs: Array.isArray(state.bodyLogs) ? state.bodyLogs : [],
    waterLogs:
      state.waterLogs && typeof state.waterLogs === 'object' && !Array.isArray(state.waterLogs)
        ? state.waterLogs
        : {},
    workoutTemplates: Array.isArray(state.workoutTemplates) ? state.workoutTemplates : [],
    completedSessions: Array.isArray(state.completedSessions)
      ? state.completedSessions
      : [],
    completedExercises:
      state.completedExercises && typeof state.completedExercises === 'object'
        ? state.completedExercises
        : {},
  }

  merged.schemaVersion = CURRENT_SCHEMA_VERSION
  merged.planSetupComplete = inferPlanSetupComplete(merged)
  return merged
}

export function parseBackupJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Backup file is empty')
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON — could not parse backup file')
  }
}

/** Validate full-app backup before import. */
export function validateBackupPayload(parsed, { byteLength = 0 } = {}) {
  if (byteLength > MAX_BACKUP_BYTES) {
    throw new Error('Backup file is too large (max 10 MB)')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup must be a JSON object')
  }

  if (Array.isArray(parsed.exercises) && !parsed.profile) {
    throw new Error(
      'This file looks like an exercises-only import/template, not a full backup. Export a full backup from Settings and import that file instead.'
    )
  }

  if (typeof parsed.onboarded !== 'boolean') {
    throw new Error('Not a full FitTrack backup (missing onboarded flag)')
  }

  if (!parsed.profile || typeof parsed.profile !== 'object') {
    throw new Error('Not a full FitTrack backup (missing profile)')
  }

  if (parsed.customExercises != null && !Array.isArray(parsed.customExercises)) {
    throw new Error('Invalid backup: customExercises must be an array')
  }

  if (parsed.workoutSchedule != null && typeof parsed.workoutSchedule !== 'object') {
    throw new Error('Invalid backup: workoutSchedule must be an object')
  }

  if (parsed.completedExercises != null && typeof parsed.completedExercises !== 'object') {
    throw new Error('Invalid backup: completedExercises must be an object')
  }

  return true
}

export function hydrateAppStateFromBackup(text, defaults = createDefaultAppState()) {
  const parsed = parseBackupJson(text)
  validateBackupPayload(parsed, { byteLength: text.length })
  return migrateAppState(parsed, defaults)
}

export function hydrateAppStateFromStorage(rawJson, defaults = createDefaultAppState()) {
  if (!rawJson) return defaults
  try {
    const parsed = JSON.parse(rawJson)
    return migrateAppState(parsed, defaults)
  } catch {
    return defaults
  }
}
