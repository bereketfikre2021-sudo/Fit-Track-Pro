import { useEffect, useRef } from 'react'
import { getAppSettings, MEAL_REMINDER_METHOD } from './appSettings'
import { showAppNotification } from './pwaNotifications'
import { toast } from 'sonner'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getTodayName() {
  return DAYS_OF_WEEK[new Date().getDay()]
}

function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{2}):(\d{2})$/)
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return { hh, mm }
}

function nextTriggerAt({ hh, mm }) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(hh, mm, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next
}

function vibratePattern() {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return false
  try {
    return navigator.vibrate([200, 80, 200])
  } catch {
    return false
  }
}

function buildBodyForSlot({ state, slot }) {
  const today = getTodayName()
  const dayMeals = state?.mealPlan?.[today] || {}
  const foods = Array.isArray(dayMeals?.[slot]) ? dayMeals[slot] : []
  if (!foods.length) return 'No items planned.'
  const preview = foods
    .map((f) => String(f?.name || '').trim())
    .filter(Boolean)
    .slice(0, 4)
  const more = foods.length > 4 ? ` (+${foods.length - 4} more)` : ''
  return preview.length ? `${preview.join(', ')}${more}` : 'Meal reminder.'
}

function titleForSlot(slot) {
  switch (slot) {
    case 'breakfast':
      return 'Breakfast'
    case 'morningSnack':
      return 'Morning snack'
    case 'lunch':
      return 'Lunch'
    case 'afternoonSnack':
      return 'Afternoon snack'
    case 'dinner':
      return 'Dinner'
    case 'beforeBed':
      return 'Before bed'
    default:
      return 'Meal'
  }
}

/**
 * Best-effort local reminders (timers in the open app / active PWA):
 * - Notifications use the PWA service worker when installed (native-style UI)
 * - True background delivery while closed needs Web Push + a server, not timers alone
 * - Samsung often kills idle apps — calendar export is still the most reliable option
 */
export function useMealReminders(state) {
  const timersRef = useRef([])

  useEffect(() => {
    const settings = getAppSettings(state)
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []

    if (settings.mealReminderMethod !== MEAL_REMINDER_METHOD.IN_APP) return
    if (!settings.mealRemindersEnabled) return

    const slots = Object.keys(settings.mealReminderTimes || {})
    const scheduleSlot = (slot) => {
      const parsed = parseHm(settings.mealReminderTimes?.[slot])
      if (!parsed) return
      const nextAt = nextTriggerAt(parsed)
      const delay = Math.max(1000, nextAt.getTime() - Date.now())

      const timer = setTimeout(() => {
        void (async () => {
          const title = `FitTrack Pro · ${titleForSlot(slot)}`
          const body = buildBodyForSlot({ state, slot })

          const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
          if (perm === 'granted') {
            const shown = await showAppNotification(title, { body, tag: `meal-${slot}` })
            if (!shown) {
              toast.info(title, { description: body, duration: 8000 })
            }
          } else {
            toast.info(title, { description: body, duration: 8000 })
          }

          if (settings.mealRemindersVibrate) {
            vibratePattern()
          }

          scheduleSlot(slot)
        })()
      }, delay)

      timersRef.current.push(timer)
    }

    slots.forEach((slot) => scheduleSlot(slot))

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current = []
    }
    // Intentionally depend on the parts that affect scheduling.
  }, [state?.appSettings, state?.mealPlan])
}

