/**
 * usePresets.js
 *
 * Fetches preset plans (meal plans, shopping lists, exercise sets) from
 * Supabase so admins can update them without a code deploy.
 *
 * Falls back to the hardcoded JS constants if:
 *   - Supabase is not reachable
 *   - The table has no rows for the requested type
 *   - The user is not signed in
 *
 * The fetched data is cached in localStorage under 'presetCache_<type>'
 * and invalidated automatically via Supabase Realtime when admin saves.
 */

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import {
  PRESET_MEAL_PLANS,
  buildPresetMealPlanDays,
  localizedPreset,
} from './presetMealPlans'
import {
  PRESET_SHOPPING_LISTS,
  buildPresetShoppingList,
  localizedShoppingPreset,
} from './presetShoppingLists'

const CACHE_TTL = 1000 * 10 // 10 seconds — picks up admin changes near-instantly

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

function clearCache(type) {
  try { localStorage.removeItem(`presetCache_${type}`) } catch {}
}

/**
 * Subscribe to Realtime changes on preset_plans.
 * When admin saves a preset, the cache is cleared so the next read
 * fetches fresh data from Supabase.
 */
function subscribeToPresetChanges(onInvalidate) {
  const channel = supabase
    .channel('preset_plans_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'preset_plans',
    }, (payload) => {
      const type = payload.new?.type || payload.old?.type
      if (type) {
        clearCache(type)
        onInvalidate(type)
      }
    })
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/**
 * Fetch preset_plans rows from Supabase for a given type.
 * Returns an array of rows (may be empty), or null only on hard error.
 */
async function fetchPresetRows(type) {
  const cached = readCache(`presetCache_${type}`)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('preset_plans')
      .select('*')
      .eq('type', type)
      .order('id')
    if (error) return null
    // Even an empty array is valid — write it so we don't keep hitting DB
    writeCache(`presetCache_${type}`, data ?? [])
    return data ?? []
  } catch { return null }
}

/**
 * Merge admin-saved data into a JS preset object.
 * The DB row's `data` field replaces the hardcoded `days`/items.
 * Meta fields (name, name_am, description, image_url, etc.) are merged in.
 */
function mergePresetRow(jsPreset, dbRow) {
  if (!dbRow) return jsPreset
  return {
    ...jsPreset,
    name:           dbRow.name          ?? jsPreset.name,
    name_am:        dbRow.name_am       ?? jsPreset.name_am,
    description:    dbRow.description   ?? jsPreset.description,
    description_am: dbRow.description_am ?? jsPreset.description_am,
    tags:           dbRow.tags          ?? jsPreset.tags,
    tags_am:        dbRow.tags_am       ?? jsPreset.tags_am,
    image_url:      dbRow.image_url     ?? null,
    // Replace days/categories with DB version if present
    ...(dbRow.data?.days       ? { days: dbRow.data.days }             : {}),
    ...(dbRow.data?.categories ? { categories: dbRow.data.categories } : {}),
  }
}

/**
 * Find a matching DB row for a JS preset.
 * Tries exact ID match first, then name-based match as fallback
 * to survive any future admin ID changes.
 */
function findMatchingRow(rows, jsPreset) {
  // 1. Exact ID match (the normal case)
  const byId = rows.find((r) => r.id === jsPreset.id)
  if (byId) return byId
  // 2. Name match (fallback — guards against admin ID drift)
  const normName = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
  const jsName = normName(jsPreset.name)
  return rows.find((r) => normName(r.name) === jsName) ?? null
}

/**
 * Hook: returns merged meal plan presets (JS + any admin overrides from DB).
 * Each preset also carries `image_url` for the card thumbnail.
 * Realtime: cache is cleared when admin saves — next render refetches.
 */
export function useMergedMealPlans() {
  const [presets, setPresets] = useState(PRESET_MEAL_PLANS)

  const load = () => {
    fetchPresetRows('meal').then((rows) => {
      if (rows === null) return
      setPresets(PRESET_MEAL_PLANS.map((jsPreset) => {
        const dbRow = findMatchingRow(rows, jsPreset)
        return mergePresetRow(jsPreset, dbRow)
      }))
    })
  }

  useEffect(() => {
    load()
    const unsub = subscribeToPresetChanges((type) => { if (type === 'meal') load() })
    return unsub
  }, [])

  return presets
}

/**
 * Hook: returns merged shopping list presets.
 * Realtime: cache cleared on admin save.
 */
export function useMergedShoppingLists() {
  const [presets, setPresets] = useState(PRESET_SHOPPING_LISTS)

  const load = () => {
    fetchPresetRows('shopping').then((rows) => {
      if (rows === null) return
      setPresets(PRESET_SHOPPING_LISTS.map((jsPreset) => {
        const dbRow = findMatchingRow(rows, jsPreset)
        return mergePresetRow(jsPreset, dbRow)
      }))
    })
  }

  useEffect(() => {
    load()
    const unsub = subscribeToPresetChanges((type) => { if (type === 'shopping') load() })
    return unsub
  }, [])

  return presets
}

/**
 * Hook: returns exercise image map { presetExId → imageUrl } from DB.
 * Keys are matched by exercise id (p-0..p-59) and also by exercise name
 * as a fallback so admin-uploaded images always resolve correctly.
 * Realtime: refreshes when admin uploads an exercise image.
 */
export function useExerciseImageMap() {
  const [imageMap, setImageMap] = useState({})

  const load = () => {
    fetchPresetRows('exercise').then((rows) => {
      if (rows === null) return // hard error — keep current state
      const map = {}
      for (const row of rows) {
        for (const ex of (row.data?.exercises ?? [])) {
          // Match by id (p-0, p-1, …)
          if (ex.id && ex.imageUrl) map[ex.id] = ex.imageUrl
          // Match by key (legacy)
          if (ex.key && ex.imageUrl) map[ex.key] = ex.imageUrl
          // Match by name (case-insensitive normalised) as final fallback
          if (ex.name && ex.imageUrl) {
            const nameKey = String(ex.name).toLowerCase().replace(/\s+/g, '-')
            map[`name:${nameKey}`] = ex.imageUrl
          }
        }
      }
      setImageMap(map)
    })
  }

  useEffect(() => {
    load()
    const unsub = subscribeToPresetChanges((type) => { if (type === 'exercise') load() })
    return unsub
  }, [])

  return imageMap
}

/**
 * Build preset meal plan days — uses DB data if available, falls back to JS.
 */
/**
 * Deduplicate foods within a slot by id first, then by name+calories.
 * Guards against admin double-saves that accumulate duplicate rows in the DB.
 */
function deduplicateFoods(foods) {
  if (!Array.isArray(foods)) return foods
  const seen = new Set()
  return foods.filter((food) => {
    // Use id if it exists and is unique
    if (food.id) {
      if (seen.has(food.id)) return false
      seen.add(food.id)
      return true
    }
    // Fallback: deduplicate by name+calories combination
    const key = `${String(food.name || '').toLowerCase().trim()}|${food.calories ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Deduplicate all foods across all days and slots in a meal plan.
 */
function deduplicateMealPlanDays(days) {
  if (!days || typeof days !== 'object') return days
  const result = {}
  for (const [day, slots] of Object.entries(days)) {
    result[day] = {}
    for (const [slot, foods] of Object.entries(slots)) {
      result[day][slot] = deduplicateFoods(foods)
    }
  }
  return result
}

export function buildMergedMealPlanDays(preset) {
  // preset.days already contains merged DB data (from useMergedMealPlans).
  // Deduplicate before returning to guard against admin double-saves.
  const raw = buildPresetMealPlanDays(preset)
  return deduplicateMealPlanDays(raw)
}

/**
 * Build preset shopping list — uses DB data if available, falls back to JS.
 */
export function buildMergedShoppingList(preset) {
  // If preset has DB-overridden categories, stamp IDs on them
  if (preset.categories) {
    const ts = Date.now()
    let i = 0
    const result = {}
    for (const [cat, items] of Object.entries(preset.categories)) {
      result[cat] = items.map((item) => ({
        ...item,
        id: `preset-shop-${ts}-${i++}`,
        checked: false,
        createdAt: ts,
      }))
    }
    return result
  }
  return buildPresetShoppingList(preset.id)
}
