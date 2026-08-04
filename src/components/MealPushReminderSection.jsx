/**
 * MealPushReminderSection.jsx
 *
 * Push notification toggle for meal reminders in the Meal Plan page.
 *
 * How it works:
 *   1. User toggles push reminders ON → permission prompt fires if needed
 *   2. FCM token is retrieved and saved to Supabase (notification_preferences)
 *   3. Meal reminder times from appSettings are saved alongside the token
 *   4. A Supabase Edge Function (supabase/functions/send-meal-reminders/)
 *      reads these preferences on a schedule and calls the FCM HTTP API
 *
 * While the app is OPEN the existing useMealReminders.js timer-based system
 * also fires — push is the complement that works when the app is closed.
 */

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useAuth } from '../lib/useAuth'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  getPermissionState,
  requestPermission,
  getFcmToken,
  saveFcmTokenToSupabase,
  saveNotificationPreferences,
  loadNotificationPreferences,
} from '../lib/fcmService'

// ── Toggle switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled, loading }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || loading}
      onClick={() => !disabled && !loading && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'pointer-events-none inline-flex h-5 w-5 rounded-full bg-white shadow-lg',
        'items-center justify-center transform transition duration-200 ease-in-out',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </span>
    </button>
  )
}

export function MealPushReminderSection({ appSettings, patchSettings }) {
  const { user } = useAuth()
  const [permState,  setPermState]  = useState(() => getPermissionState())
  const [loading,    setLoading]    = useState(false)
  const [cloudSaved, setCloudSaved] = useState(false)

  const isConfigured  = isFirebaseConfigured()
  const isEnabled     = appSettings.mealPushRemindersEnabled
  const isDenied      = permState === 'denied'
  const isUnsupported = permState === 'unsupported'
  const isSignedIn    = !!user

  // Check if prefs are already saved in Supabase on mount
  useEffect(() => {
    if (!user?.id) return
    loadNotificationPreferences(user.id).then((prefs) => {
      if (prefs?.meal_reminders_enabled) setCloudSaved(true)
    })
  }, [user?.id])

  const handleToggle = useCallback(async (enable) => {
    if (!isConfigured) {
      toast.error('Push notifications are not configured for this app.')
      return
    }
    if (isUnsupported) {
      toast.error('Push notifications are not supported in this browser.')
      return
    }

    setLoading(true)

    if (enable) {
      // Request permission if not yet granted
      const perm = await requestPermission()
      setPermState(perm)

      if (perm === 'denied') {
        setLoading(false)
        toast.error('Notifications blocked. Enable them in your browser settings, then try again.')
        return
      }
      if (perm !== 'granted') {
        setLoading(false)
        return
      }

      // Get FCM token
      const token = await getFcmToken()
      if (!token) {
        setLoading(false)
        toast.error('Could not get push token. Try again.')
        return
      }

      // Save token + meal reminder prefs to Supabase
      if (user?.id) {
        await saveFcmTokenToSupabase(user.id, token)
        await saveNotificationPreferences(user.id, {
          meal_reminders_enabled:    true,
          notifications_enabled:     true,
          // Save each slot's reminder time so the Edge Function can schedule them
          ...buildMealTimesPayload(appSettings.mealReminderTimes),
        })
        setCloudSaved(true)
      }

      // Also update local app settings
      patchSettings({ mealPushRemindersEnabled: true })
      toast.success('Meal push reminders enabled! You\'ll be notified even when the app is closed.')
    } else {
      // Disable
      if (user?.id) {
        await saveNotificationPreferences(user.id, { meal_reminders_enabled: false })
        setCloudSaved(false)
      }
      patchSettings({ mealPushRemindersEnabled: false })
      toast.info('Meal push reminders disabled.')
    }

    setLoading(false)
  }, [isConfigured, isUnsupported, user, appSettings.mealReminderTimes, patchSettings])

  // Sync reminder times to Supabase whenever they change while push is enabled
  useEffect(() => {
    if (!isEnabled || !user?.id || !isConfigured) return
    saveNotificationPreferences(user.id, {
      meal_reminders_enabled: true,
      ...buildMealTimesPayload(appSettings.mealReminderTimes),
    }).catch(() => {/* silent */})
  }, [isEnabled, user?.id, appSettings.mealReminderTimes, isConfigured])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2.5">
      {/* Header row with toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Bell className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">Push notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isUnsupported
                ? 'Not supported in this browser'
                : isDenied
                ? 'Blocked — update browser settings to allow'
                : !isConfigured
                ? 'Not configured'
                : isEnabled && cloudSaved
                ? 'Active — fires even when the app is closed'
                : 'Works when app is closed (recommended)'}
            </p>
          </div>
        </div>
        <ToggleSwitch
          checked={isEnabled}
          onChange={handleToggle}
          disabled={!isConfigured || isUnsupported || isDenied}
          loading={loading}
        />
      </div>

      {/* Sign-in nudge */}
      {isEnabled && !isSignedIn && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <p>
            Sign in to save your notification preferences to the cloud so they work on all your devices.
          </p>
        </div>
      )}

      {/* Denied guidance */}
      {isDenied && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <BellOff className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium">Notifications are blocked</p>
            <p className="mt-0.5 text-red-300">
              Click the lock icon in your browser address bar → set Notifications to Allow → reload.
            </p>
          </div>
        </div>
      )}

      {/* Cloud saved confirmation */}
      {isEnabled && cloudSaved && isSignedIn && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Preferences saved — the notification service will send reminders on schedule.</span>
        </div>
      )}

      {/* Info note about server-side delivery */}
      {isEnabled && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <p>
            Push reminders are delivered by the FitTrack Pro notification service.
            In-app reminders (while the app is open) still fire from your local settings below.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Maps appSettings.mealReminderTimes to the DB column names */
function buildMealTimesPayload(times = {}) {
  // We store them as a JSONB column in notification_preferences.
  // The Edge Function reads this to know when to send each slot's push.
  return {
    meal_reminder_times: {
      breakfast:      times.breakfast      || '07:00',
      morningSnack:   times.morningSnack   || '10:00',
      lunch:          times.lunch          || '13:00',
      afternoonSnack: times.afternoonSnack || '16:00',
      dinner:         times.dinner         || '19:00',
      beforeBed:      times.beforeBed      || '22:00',
    },
  }
}

export default MealPushReminderSection
