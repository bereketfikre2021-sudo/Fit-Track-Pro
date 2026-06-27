import { useEffect, useRef } from 'react'
import { getAppSettings } from './appSettings'
import { showAppNotification, requestNotificationPermission } from './pwaNotifications'

/**
 * Schedules a daily workout reminder notification at the user's chosen time.
 * Uses a polling interval (checks every minute) — no server push required.
 */
export function useWorkoutReminder(state) {
  const firedRef = useRef(null) // tracks last date the reminder fired

  useEffect(() => {
    const settings = getAppSettings(state)
    if (!settings.workoutReminderEnabled) return

    const [hh, mm] = settings.workoutReminderTime.split(':').map(Number)

    const check = async () => {
      const now = new Date()
      const todayKey = now.toISOString().slice(0, 10)

      // Already fired today
      if (firedRef.current === todayKey) return

      if (now.getHours() === hh && now.getMinutes() === mm) {
        firedRef.current = todayKey
        const perm = await requestNotificationPermission()
        if (perm !== 'granted') return
        await showAppNotification('Time to work out! 💪', {
          body: 'Your daily workout reminder from FitTrack Pro.',
          tag: 'fittrack-workout-reminder',
        })
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [
    state.appSettings?.workoutReminderEnabled,
    state.appSettings?.workoutReminderTime,
  ])
}
