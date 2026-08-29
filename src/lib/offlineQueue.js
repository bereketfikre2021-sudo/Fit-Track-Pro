/**
 * offlineQueue.js
 *
 * A lightweight, localStorage-backed queue for Supabase writes that
 * failed or were skipped due to the device being offline.
 *
 * Each entry describes ONE sync operation to retry:
 *   { id, type, payload, userId, enqueuedAt }
 *
 * Supported types:
 *   'profile'         → syncUserProfile(userId, payload)
 *   'bodyLog'         → syncBodyLog(userId, payload)
 *   'mealSlot'        → syncMealSlot(userId, payload.day, payload.slot, payload.foods)
 *   'waterLog'        → syncWaterLog(userId, payload.date, payload.cups, payload.goalCups)
 *   'workoutSession'  → syncWorkoutSession(userId, payload.session, payload.completedEx)
 */

import {
  syncUserProfile,
  syncBodyLog,
  syncMealSlot,
  syncWaterLog,
  syncWorkoutSession,
  syncWorkoutData,
} from './supabaseDb'

const QUEUE_KEY = 'fittrack_offline_queue'
const MAX_ENTRIES = 200   // safety cap so localStorage doesn't balloon

// ─────────────────────────────────────────────────────────────────────────────
//  Storage helpers
// ─────────────────────────────────────────────────────────────────────────────

export function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // Storage full — drop oldest entries and retry once
    try {
      const trimmed = queue.slice(-Math.floor(MAX_ENTRIES / 2))
      localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed))
    } catch {
      /* silently ignore */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an operation to the queue.
 * Deduplicates by type + a natural key so rapid changes don't stack up.
 */
export function enqueue(type, userId, payload) {
  const queue = readQueue()

  // Natural dedup key — replace the existing entry for the same logical record
  const dedupKey = getDedupKey(type, payload)
  const filtered = dedupKey
    ? queue.filter((e) => !(e.type === type && getDedupKey(e.type, e.payload) === dedupKey))
    : queue

  const entry = {
    id:          `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    userId,
    payload,
    enqueuedAt:  Date.now(),
  }

  const next = [...filtered, entry].slice(-MAX_ENTRIES)
  writeQueue(next)
}

function getDedupKey(type, payload) {
  switch (type) {
    case 'profile':        return 'profile'
    case 'bodyLog':        return payload?.date
    case 'mealSlot':       return `${payload?.day}__${payload?.slot}`
    case 'waterLog':       return payload?.date
    case 'workoutSession': return `${payload?.session?.day}__${payload?.session?.date}`
    case 'workoutData':    return 'workoutData'
    default:               return null
  }
}

/** Number of pending operations. */
export function queueSize() {
  return readQueue().length
}

/**
 * Drain the queue — call all pending operations against Supabase.
 * Removes each entry as it succeeds; leaves failures in place for next attempt.
 *
 * Returns { flushed, failed }.
 */
export async function drainQueue() {
  const queue = readQueue()
  if (!queue.length) return { flushed: 0, failed: 0 }

  let flushed = 0
  let failed  = 0
  const remaining = []

  for (const entry of queue) {
    const ok = await executeEntry(entry)
    if (ok) {
      flushed++
    } else {
      failed++
      remaining.push(entry)
    }
  }

  writeQueue(remaining)
  return { flushed, failed }
}

/** Clear the queue entirely (e.g. on sign-out). */
export function clearQueue() {
  try { localStorage.removeItem(QUEUE_KEY) } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Execution
// ─────────────────────────────────────────────────────────────────────────────

async function executeEntry(entry) {
  const { type, userId, payload } = entry
  try {
    switch (type) {
      case 'profile':
        await syncUserProfile(userId, payload)
        break
      case 'bodyLog':
        await syncBodyLog(userId, payload)
        break
      case 'mealSlot':
        await syncMealSlot(userId, payload.day, payload.slot, payload.foods)
        break
      case 'waterLog':
        await syncWaterLog(userId, payload.date, payload.cups, payload.goalCups)
        break
      case 'workoutSession':
        await syncWorkoutSession(userId, payload.session, payload.completedEx)
        break
      case 'workoutData':
        await syncWorkoutData(userId, payload.workoutSchedule, payload.customExercises)
        break
      default:
        console.warn('[offlineQueue] Unknown entry type:', type)
        return true  // drop unknown types
    }
    return true
  } catch (err) {
    console.warn('[offlineQueue] Failed to execute entry:', type, err?.message)
    return false
  }
}
