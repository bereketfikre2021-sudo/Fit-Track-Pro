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

const CACHE_TTL = 1000 * 60 * 5 // 5 minutes — short enough to pick up admin changes quickly

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
 * Returns an array of rows or null on failure (triggers static fallback).
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
    if (error || !data?.length) return null
    writeCache(`presetCache_${type}`, data)
    return data
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
    name:          dbRow.name       ?? jsPreset.name,
    name_am:       dbRow.name_am    ?? jsPreset.name_am,
    description:   dbRow.description     ?? jsPreset.description,
    description_am: dbRow.description_am ?? jsPreset.description_am,
    tags:          dbRow.tags       ?? jsPreset.tags,
    tags_am:       dbRow.tags_am    ?? jsPreset.tags_am,
    image_url:     dbRow.image_url  ?? null,
    // Replace days/categories with DB version if present
    ...(dbRow.data?.days       ? { days: dbRow.data.days }             : {}),
    ...(dbRow.data?.categories ? { categories: dbRow.data.categories } : {}),
  }
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
      if (!rows) return // keep static fallback
      setPresets(PRESET_MEAL_PLANS.map((jsPreset) => {
        const dbRow = rows.find((r) => r.id === jsPreset.id)
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
      if (!rows) return
      setPresets(PRESET_SHOPPING_LISTS.map((jsPreset) => {
        const dbRow = rows.find((r) => r.id === jsPreset.id)
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
 * Used to show admin-uploaded thumbnails on preset exercise cards.
 * Realtime: refreshes when admin uploads an exercise image.
 */
export function useExerciseImageMap() {
  const [imageMap, setImageMap] = useState({})

  const load = () => {
    fetchPresetRows('exercise').then((rows) => {
      if (!rows) return
      const map = {}
      for (const row of rows) {
        for (const ex of (row.data?.exercises ?? [])) {
          if (ex.id && ex.imageUrl) map[ex.id] = ex.imageUrl
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
export function buildMergedMealPlanDays(preset) {
  // preset.days already contains merged DB data (from useMergedMealPlans)
  return buildPresetMealPlanDays(preset)
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
