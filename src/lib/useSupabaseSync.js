/**
 * useSupabaseSync
 *
 * Watches app state for changes and syncs the relevant slices to Supabase.
 * When the device is offline, writes are queued in localStorage and retried
 * automatically when the connection returns.
 *
 * Priority order:
 *   1. localStorage (useDebouncedSave, 400 ms) — always first, never blocked
 *   2. Supabase (this hook, 1500 ms) — online: direct call; offline: enqueue
 *   3. Drain queue on reconnect
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { enqueue, drainQueue } from './offlineQueue'
import {
  syncUserProfile,
  syncBodyLog,
  syncMealSlot,
  syncWaterLog,
  syncWorkoutSession,
} from './supabaseDb'

const SYNC_DELAY_MS = 1500

// ─── tiny helper: call fn directly if online, otherwise enqueue ──────────────
function syncOrQueue(isOnline, type, userId, payload, directFn) {
  if (isOnline) {
    directFn().catch(() => enqueue(type, userId, payload))
  } else {
    enqueue(type, userId, payload)
  }
}

export function useSupabaseSync(state) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Drain queued writes as soon as network returns
  const { isOnline } = useOnlineStatus({
    onReconnect: () => {
      if (userId) drainQueue()
    },
  })

  const prevProfile           = useRef(null)
  const prevBodyLogs          = useRef(null)
  const prevMealPlan          = useRef(null)
  const prevWaterLogs         = useRef(null)
  const prevCompletedSessions = useRef(null)

  // Seed refs with the current state snapshot on the very first render so
  // any initial cloud-load write is NOT treated as a local change to push back.
  const seeded = useRef(false)
  if (!seeded.current) {
    seeded.current       = true
    prevMealPlan.current = JSON.stringify(state.mealPlan ?? {})
    prevProfile.current  = JSON.stringify(state.profile ?? {})
  }

  const isReady = !!(userId && state.onboarded)

  // Expose a way for App.jsx cloud-load to silence the sync after it writes
  // cloud data to state (cloud→local should never be pushed back to cloud).
  const suppressNextMealSync = useRef(false)
  const suppressNextMealSyncFn = useCallback(() => {
    suppressNextMealSync.current = true
  }, [])

  // ── Profile ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const cur = JSON.stringify(state.profile)
    if (cur === prevProfile.current) return
    prevProfile.current = cur

    const timer = setTimeout(() => {
      const payload = state.profile
      syncOrQueue(isOnline, 'profile', userId, payload, () =>
        syncUserProfile(userId, payload)
      )
    }, SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, isReady, isOnline, state.profile])

  // ── Body logs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const cur = JSON.stringify(state.bodyLogs)
    if (cur === prevBodyLogs.current) return

    const prev = prevBodyLogs.current ? JSON.parse(prevBodyLogs.current) : []
    prevBodyLogs.current = cur

    const prevIds = new Set(prev.map((l) => l.id))
    const changed = (state.bodyLogs || []).filter(
      (l) =>
        !prevIds.has(l.id) ||
        JSON.stringify(prev.find((p) => p.id === l.id)) !== JSON.stringify(l)
    )
    if (!changed.length) return

    const timer = setTimeout(() => {
      changed.forEach((entry) =>
        syncOrQueue(isOnline, 'bodyLog', userId, entry, () =>
          syncBodyLog(userId, entry)
        )
      )
    }, SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, isReady, isOnline, state.bodyLogs])

  // ── Meal plan ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const cur = JSON.stringify(state.mealPlan)
    if (cur === prevMealPlan.current) return

    // If the cloud load just wrote this state, silently update the ref and skip
    // pushing back to Supabase (cloud → local must not echo back to cloud).
    if (suppressNextMealSync.current) {
      suppressNextMealSync.current = false
      prevMealPlan.current = cur
      return
    }

    const prevPlan = prevMealPlan.current ? JSON.parse(prevMealPlan.current) : {}
    prevMealPlan.current = cur

    const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']

    const changed = []
    for (const day of DAYS) {
      for (const slot of SLOTS) {
        const curSlot  = JSON.stringify(state.mealPlan?.[day]?.[slot] ?? [])
        const prevSlot = JSON.stringify(prevPlan?.[day]?.[slot] ?? [])
        if (curSlot !== prevSlot) {
          changed.push({ day, slot, foods: state.mealPlan?.[day]?.[slot] ?? [] })
        }
      }
    }
    if (!changed.length) return

    const timer = setTimeout(() => {
      changed.forEach(({ day, slot, foods }) => {
        const payload = { day, slot, foods }
        syncOrQueue(isOnline, 'mealSlot', userId, payload, () =>
          syncMealSlot(userId, day, slot, foods)
        )
      })
    }, SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, isReady, isOnline, state.mealPlan])

  // ── Water logs ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const cur = JSON.stringify(state.waterLogs)
    if (cur === prevWaterLogs.current) return

    const prevWater = prevWaterLogs.current ? JSON.parse(prevWaterLogs.current) : {}
    prevWaterLogs.current = cur

    const goalCups = state.appSettings?.waterGoalCups ?? 8
    const changed = Object.entries(state.waterLogs || {}).filter(
      ([date, cups]) => prevWater[date] !== cups
    )
    if (!changed.length) return

    const timer = setTimeout(() => {
      changed.forEach(([date, cups]) => {
        const payload = { date, cups, goalCups }
        syncOrQueue(isOnline, 'waterLog', userId, payload, () =>
          syncWaterLog(userId, date, cups, goalCups)
        )
      })
    }, SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, isReady, isOnline, state.waterLogs, state.appSettings?.waterGoalCups])

  // ── Completed sessions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return
    const cur = JSON.stringify(state.completedSessions)
    if (cur === prevCompletedSessions.current) return

    const prev = prevCompletedSessions.current
      ? JSON.parse(prevCompletedSessions.current)
      : []
    prevCompletedSessions.current = cur

    const prevIds = new Set(prev.map((s) => s.id))
    const newSessions = (state.completedSessions || []).filter((s) => !prevIds.has(s.id))
    if (!newSessions.length) return

    const timer = setTimeout(() => {
      newSessions.forEach((session) => {
        const payload = { session, completedEx: state.completedExercises }
        syncOrQueue(isOnline, 'workoutSession', userId, payload, () =>
          syncWorkoutSession(userId, session, state.completedExercises)
        )
      })
    }, SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [userId, isReady, isOnline, state.completedSessions, state.completedExercises])

  return { suppressNextMealSync: suppressNextMealSyncFn }
}
