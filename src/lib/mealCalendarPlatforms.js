/**
 * Device guides for importing meal-reminders.ics.
 * The `android` platform is written for Samsung Galaxy / Samsung Calendar first.
 */

export const MEAL_CALENDAR_PLATFORMS = ['android', 'iphone', 'windows', 'other']

export function normalizeMealCalendarPlatform(value) {
  return MEAL_CALENDAR_PLATFORMS.includes(value) ? value : 'other'
}

function userAgentString(override) {
  if (override != null) return String(override)
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent || ''
}

/** True on Samsung Galaxy browsers / WebView (primary Android target). */
export function isSamsungAndroidDevice(uaOverride) {
  const ua = userAgentString(uaOverride)
  if (!/Android/i.test(ua)) return false
  return /Samsung|SamsungBrowser|SM-|SAMSUNG/i.test(ua)
}

/** Best-effort default from user agent (user can override in meal reminder setup). */
export function detectMealCalendarPlatform(uaOverride) {
  const ua = userAgentString(uaOverride)
  if (!ua) return 'other'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone'
  if (/Android/i.test(ua)) return 'android'
  if (/Windows/i.test(ua)) return 'windows'
  return 'other'
}
