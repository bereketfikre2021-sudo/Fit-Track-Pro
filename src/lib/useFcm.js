/**
 * useFcm.js
 *
 * React hook that manages the full FCM lifecycle for a signed-in user:
 *
 *   1. On mount (or when userId changes):
 *      a. Check current permission state
 *      b. If granted, retrieve the FCM token and save it to Supabase
 *      c. Subscribe to foreground messages → display as in-app toast
 *
 *   2. Exposes:
 *      - permissionState  — 'default' | 'granted' | 'denied' | 'unsupported'
 *      - token            — current FCM token string, or null
 *      - requesting       — true while the permission prompt is open
 *      - enableNotifications() — call this from UI to request permission
 *      - disableNotifications() — revoke token + update Supabase
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getPermissionState,
  requestPermission,
  getFcmToken,
  deleteFcmToken,
  saveFcmTokenToSupabase,
  onForegroundMessage,
} from './fcmService'
import { isFirebaseConfigured } from './firebase'

export function useFcm(userId) {
  const [permissionState, setPermissionState] = useState(() => getPermissionState())
  const [token, setToken]                     = useState(null)
  const [requesting, setRequesting]           = useState(false)
  const unsubscribeRef                         = useRef(null)

  // ── Refresh token and save to Supabase ───────────────────────────────────
  const refreshToken = useCallback(async () => {
    if (!userId || !isFirebaseConfigured()) return

    const currentPerm = getPermissionState()
    setPermissionState(currentPerm)
    if (currentPerm !== 'granted') return

    const fcmToken = await getFcmToken()
    if (fcmToken) {
      setToken(fcmToken)
      await saveFcmTokenToSupabase(userId, fcmToken)
    }
  }, [userId])

  // ── Subscribe to foreground messages ────────────────────────────────────
  const subscribeToMessages = useCallback(async () => {
    // Clean up any previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    const unsubscribe = await onForegroundMessage((payload) => {
      // FCM delivers the message here when the app tab is in the foreground.
      // The service worker handles background delivery natively.
      const title = payload?.notification?.title ?? 'FitTrack Pro'
      const body  = payload?.notification?.body  ?? ''

      // Show as in-app toast — matches the existing FitTrack Pro toast style
      toast.info(title, {
        description: body || undefined,
        duration:    8000,
      })
    })

    unsubscribeRef.current = unsubscribe
  }, [])

  // ── Initialise on mount / userId change ─────────────────────────────────
  useEffect(() => {
    if (!userId || !isFirebaseConfigured()) return

    refreshToken()
    subscribeToMessages()

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId, refreshToken, subscribeToMessages])

  // ── Public: request permission then get token ────────────────────────────
  const enableNotifications = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      toast.error('Push notifications are not configured for this app.')
      return 'unsupported'
    }

    setRequesting(true)
    try {
      const result = await requestPermission()
      setPermissionState(result)

      if (result === 'granted') {
        await refreshToken()
        await subscribeToMessages()
        toast.success('Notifications enabled!')
      } else if (result === 'denied') {
        toast.error(
          'Notifications were blocked. Enable them in your browser settings.',
          { duration: 7000 }
        )
      }

      return result
    } finally {
      setRequesting(false)
    }
  }, [refreshToken, subscribeToMessages])

  // ── Public: revoke token + clean up ─────────────────────────────────────
  const disableNotifications = useCallback(async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    await deleteFcmToken()
    setToken(null)
  }, [])

  return {
    permissionState,
    token,
    requesting,
    enableNotifications,
    disableNotifications,
    refreshToken,
  }
}
