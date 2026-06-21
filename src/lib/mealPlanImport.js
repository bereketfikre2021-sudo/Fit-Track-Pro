import { MEAL_SLOT_IDS } from './mealPlan'

export const MEAL_IMPORT_VERSION = 1

export const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function normalizeDayName(day) {
  if (!day || typeof day !== 'string') return null
  const trimmed = day.trim()
  return WEEKDAY_ORDER.find((d) => d.toLowerCase() === trimmed.toLowerCase()) || null
}

export function getMealPlanImportTemplate() {
  const emptyDay = () =>
    MEAL_SLOT_IDS.reduce((acc, slot) => {
      acc[slot] = []
      return acc
    }, {})

  const template = WEEKDAY_ORDER.reduce((acc, day) => {
    acc[day] = emptyDay()
    return acc
  }, {})

  template.Monday.breakfast = [
    { name: 'Genfo (teff porridge) + ayib', calories: 350, protein: 12 },
    { name: 'Boiled eggs (2)', calories: 140, protein: 12 },
  ]
  template.Monday.lunch = [
    { name: 'Injera with shiro wot', calories: 520, protein: 18 },
    { name: 'Atkilt (cabbage, carrot, potato)', calories: 180, protein: 4 },
  ]
  template.Monday.dinner = [
    { name: 'Chicken tibs + injera', calories: 580, protein: 42 },
    { name: 'Gomen', calories: 90, protein: 4 },
  ]

  return {
    version: MEAL_IMPORT_VERSION,
    description:
      'FitTrack Pro weekly meal plan import template. Fill in foods under each day/meal slot, then import the JSON from the Meals page.',
    mealPlan: template,
  }
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadMealPlanTemplate() {
  downloadJsonFile(getMealPlanImportTemplate(), 'fittrack-weekly-meals-template.json')
}

export function buildMealPlanExportPayload(state) {
  const mealPlan = state?.mealPlan || {}
  return {
    version: MEAL_IMPORT_VERSION,
    exportedAt: new Date().toISOString(),
    description: 'FitTrack Pro weekly meal plan export.',
    mealPlan,
  }
}

export function downloadMealPlanExport(state) {
  const payload = buildMealPlanExportPayload(state)
  const date = new Date().toISOString().slice(0, 10)
  downloadJsonFile(payload, `fittrack-weekly-meals-${date}.json`)
  return payload
}

function normalizeFoodsList(list, baseTime, startIndex) {
  if (!Array.isArray(list)) return []
  let idx = startIndex
  return list
    .map((raw) => {
      const name = String(raw?.name || '').trim()
      if (!name) return null
      const calories = raw?.calories ?? ''
      const protein = raw?.protein ?? ''
      const createdAt = baseTime + idx
      const id = `import-meal-${createdAt}-${idx}`
      idx += 1
      return {
        id,
        name,
        calories,
        protein,
        createdAt,
      }
    })
    .filter(Boolean)
}

export function normalizeMealPlanImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file: expected a JSON object')
  }

  // Accept either { mealPlan: {...} } or raw mealPlan object keyed by days.
  const mealPlanRaw =
    parsed.mealPlan && typeof parsed.mealPlan === 'object' ? parsed.mealPlan : parsed

  const baseTime = Date.now()
  let counter = 0
  const normalized = {}

  Object.entries(mealPlanRaw || {}).forEach(([dayRaw, dayMeals]) => {
    const day = normalizeDayName(dayRaw)
    if (!day) return
    const dayObj = {}
    MEAL_SLOT_IDS.forEach((slot) => {
      dayObj[slot] = normalizeFoodsList(dayMeals?.[slot], baseTime, counter)
      counter += dayObj[slot].length
    })
    normalized[day] = dayObj
  })

  if (Object.keys(normalized).length === 0) {
    throw new Error('No valid days found. Use Monday–Sunday keys with meals inside.')
  }

  return normalized
}

export function applyMealPlanImport(state, parsed, { replace = true } = {}) {
  const importedMealPlan = normalizeMealPlanImportPayload(parsed)
  const existing = state.mealPlan || {}

  const mealPlan = replace ? importedMealPlan : { ...existing, ...importedMealPlan }

  return {
    mealPlan,
    summary: {
      daysImported: Object.keys(importedMealPlan).length,
      replace,
    },
  }
}

