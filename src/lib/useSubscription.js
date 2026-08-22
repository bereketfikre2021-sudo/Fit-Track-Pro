/**
 * useSubscription.js
 * Hook that fetches the user's active subscription from Supabase
 * and exposes feature flags based on their plan.
 *
 * Feature gating:
 *   free:  ads=true,  ai=false, export=false, max_ai_calls_day=5
 *   pro:   ads=false, ai=true,  export=true,  max_ai_calls_day=50
 *   elite: ads=false, ai=true,  export=true,  max_ai_calls_day=200
 *   team:  ads=false, ai=true,  export=true,  max_ai_calls_day=1000
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const FREE_FEATURES = {
  ai: false,
  ads: true,
  export: false,
  priority_support: false,
  max_ai_calls_day: 5,
  max_devices: 1,
  tier: 'free',
  planName: 'Free',
  isActive: false,
  isFree: true,
}

const CACHE_KEY = 'fittrack_sub_cache'
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch {}
}

export function useSubscription() {
  const [features, setFeatures] = useState(() => readCache() ?? FREE_FEATURES)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  const load = useCallback(async (uid) => {
    if (!uid) { setFeatures(FREE_FEATURES); setLoading(false); return }
    try {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('status, current_period_end, plan:subscription_plans(name, tier, features, max_ai_calls_day, max_devices)')
        .eq('user_id', uid)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!data || !data.plan) {
        setFeatures(FREE_FEATURES)
        writeCache(FREE_FEATURES)
        return
      }

      const plan = data.plan
      const f = plan.features ?? {}
      const result = {
        ai:               f.ai               === true,
        ads:              f.ads              !== false,  // default to showing ads unless explicitly false
        export:           f.export           === true,
        priority_support: f.priority_support === true,
        max_ai_calls_day: plan.max_ai_calls_day ?? 5,
        max_devices:      plan.max_devices    ?? 1,
        tier:             plan.tier           ?? 'free',
        planName:         plan.name           ?? 'Free',
        isActive:         data.status === 'active' || data.status === 'trialing',
        isFree:           plan.tier === 'free',
        expiresAt:        data.current_period_end ?? null,
      }
      setFeatures(result)
      writeCache(result)
    } catch (e) {
      // On error keep cached/free state — don't lock user out
      console.warn('[useSubscription] fetch error:', e?.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      load(uid)
    })
  }, [load])

  // Realtime: refresh when subscription changes (admin approves)
  useEffect(() => {
    if (!userId) return
    const ch = supabase.channel('sub-features-' + userId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_subscriptions',
        filter: `user_id=eq.${userId}`,
      }, () => { clearCache(); load(userId) })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [userId, load])

  return { features, loading }
}

/**
 * Standalone helper — reads cached subscription features synchronously.
 * Used in non-hook contexts. Returns FREE_FEATURES if no cache.
 */
export function getCachedFeatures() {
  return readCache() ?? FREE_FEATURES
}
