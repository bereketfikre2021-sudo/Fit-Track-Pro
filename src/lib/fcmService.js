/**
 * fcmService.js
 *
 * High-level FCM operations:
 *   - Request notification permission
 *   - Retrieve / refresh the FCM registration token
 *   - Persist the token to Supabase (notification_preferences table)
 *   - Subscribe to foreground messages
 *
 * Design principles:
 *   - Every function is safe to call when Firebase is not configured — it logs
 *     a warning and returns null/false so callers need no guard code.
 *   - Tokens are cached in sessionStorage to avoid redundant Supabase writes
 *     on each page reload within the same browser session.
 */

import { getToken, onMessage, deleteToken } from 'firebase/messaging'
import { getFirebaseMessaging, isFirebaseConfigured } from './firebase'
import { supabase } from './supabase'

const VAPID_KEY        = import.meta.env.VITE_FIREBASE_VAPID_KEY
const TOKEN_CACHE_KEY  = 'fittrack_fcm_token'

// ── Permission helpers ────────────────────────────────────────────────────────

/** Returns the current Notification permission state. */
export function getPermissionState() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission   // 'default' | 'granted' | 'denied'
}

/**
 * Requests notification permission if it hasn't been decided yet.
 * Never re-prompts if already granted or denied.
 *
 * @returns {'granted'|'denied'|'default'|'unsupported'}
 */
export async function requestPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

// ── Token management ──────────────────────────────────────────────────────────

/**
 * Retrieves the current FCM registration token.
 * Requires:
 *   - Notification permission === 'granted'
 *   - Firebase configured
 *   - VAPID key set
 *   - Service worker registered (PWA SW or the dedicated firebase-messaging-sw.js)
 *
 * @returns {string|null} The FCM token, or null on failure.
 */
export async function getFcmToken() {
  if (!isFirebaseConfigured()) {
    console.info('[FCM] Not configured — skipping token retrieval.')
    return null
  }
  if (getPermissionState() !== 'granted') return null
  if (!VAPID_KEY || VAPID_KEY.startsWith('your-')) {
    console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not set.')
    return null
  }

  const messaging = await getFirebaseMessaging()
  if (!messaging) return null

  try {
    // Get the active service worker registration — FCM needs it for push delivery
    const swRegistration = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.ready
      : undefined

    const token = await getToken(messaging, {
      vapidKey:            VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })

    return token || null
  } catch (err) {
    console.warn('[FCM] getToken failed:', err?.message)
    return null
  }
}

/**
 * Deletes the current FCM token (e.g. on sign-out or when user disables
 * notifications). Also removes the cached token from sessionStorage.
 */
export async function deleteFcmToken() {
  try {
    const messaging = await getFirebaseMessaging()
    if (messaging) await deleteToken(messaging)
  } catch { /* ignore */ }
  sessionStorage.removeItem(TOKEN_CACHE_KEY)
}

// ── Supabase persistence ──────────────────────────────────────────────────────

/**
 * Saves the FCM token to the notification_preferences table in Supabase.
 * Upserts so that subsequent logins on the same device update the token
 * rather than creating duplicates.
 *
 * The token is cached in sessionStorage — if it hasn't changed since the
 * last call in this browser session, Supabase is not written to again.
 *
 * @param {string} userId  - Supabase auth user id
 * @param {string} token   - FCM registration token
 */
export async function saveFcmTokenToSupabase(userId, token) {
  if (!userId || !token) return

  // Avoid redundant writes within the same browser session
  const cached = sessionStorage.getItem(TOKEN_CACHE_KEY)
  if (cached === token) return

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id:   userId,
        fcm_token: token,
        platform:  detectPlatform(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

  if (error) {
    console.warn('[FCM] Failed to save token to Supabase:', error.message)
  } else {
    sessionStorage.setItem(TOKEN_CACHE_KEY, token)
  }
}

/**
 * Loads notification preferences for a user from Supabase.
 * Returns the row for the current platform, or null.
 */
export async function loadNotificationPreferences(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', detectPlatform())
    .single()

  if (error && error.code !== 'PGRST116') {   // PGRST116 = row not found
    console.warn('[FCM] Failed to load notification preferences:', error.message)
  }
  return data ?? null
}

/**
 * Updates notification preference flags for the current user/platform.
 */
export async function saveNotificationPreferences(userId, prefs) {
  if (!userId) return

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id:  userId,
        platform: detectPlatform(),
        ...prefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

  if (error) {
    console.warn('[FCM] Failed to save notification preferences:', error.message)
  }
}

// ── Foreground message listener ───────────────────────────────────────────────

/**
 * Registers a callback for messages received while the app is in the foreground.
 * Background messages are handled by firebase-messaging-sw.js.
 *
 * @param {(payload: import('firebase/messaging').MessagePayload) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export async function onForegroundMessage(callback) {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return () => {}

  return onMessage(messaging, callback)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Detects the current platform for per-device token storage.
 * Helps differentiate tokens if the same user uses multiple devices.
 */
function detectPlatform() {
  if (typeof window === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua))  return 'ios-web'
  if (/android/.test(ua))            return 'android-web'
  return 'web'
}
