import {
  detectMealCalendarPlatform,
  normalizeMealCalendarPlatform,
} from './mealCalendarPlatforms'

/** User preferences (rest timer, etc.) */

/** @typedef {'calendar' | 'inApp'} MealReminderMethod */

export const MEAL_REMINDER_METHOD = {
  CALENDAR: 'calendar',
  IN_APP: 'inApp',
}

export const SUPPORTED_LOCALES = ['en', 'am']

export const DEFAULT_APP_SETTINGS = {
  locale: 'en',
  autoStartRestOnComplete: true,
  defaultRestSeconds: 60,
  restTimerSound: true,
  restTimerVibrate: true,
  enableSetLogging: false,
  /** Phone/system calendar via .ics — works when the PWA is closed */
  mealReminderMethod: 'calendar',
  mealCalendarPlatform: detectMealCalendarPlatform(),
  mealCalendarRemindersSetUp: false,
  mealRemindersEnabled: false,
  mealRemindersVibrate: true,
  mealReminderTimes: {
    breakfast: '07:00',
    morningSnack: '10:00',
    lunch: '13:00',
    afternoonSnack: '16:00',
    dinner: '19:00',
    beforeBed: '22:00',
  },
  /** Optional — used when VITE_GEMINI_API_KEY is not set (stored locally on device). */
  geminiApiKey: '',
  geminiModel: '',
  /** Daily water goal in cups (1 cup ≈ 250 ml) */
  waterGoalCups: 8,
}

const MEAL_SLOT_IDS = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
  'beforeBed',
]

function normalizeTimeString(value, fallback) {
  if (typeof value !== 'string') return fallback
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return fallback
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallback
  if (hh < 0 || hh > 23) return fallback
  if (mm < 0 || mm > 59) return fallback
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function normalizeAppSettings(settings) {
  const s = { ...DEFAULT_APP_SETTINGS, ...(settings || {}) }
  const baseTimes = DEFAULT_APP_SETTINGS.mealReminderTimes
  const incomingTimes =
    s.mealReminderTimes && typeof s.mealReminderTimes === 'object' ? s.mealReminderTimes : {}

  const mealReminderTimes = {}
  MEAL_SLOT_IDS.forEach((slot) => {
    mealReminderTimes[slot] = normalizeTimeString(incomingTimes[slot], baseTimes[slot])
  })

  const mealReminderMethod =
    s.mealReminderMethod === MEAL_REMINDER_METHOD.IN_APP
      ? MEAL_REMINDER_METHOD.IN_APP
      : MEAL_REMINDER_METHOD.CALENDAR

  const rest = Number(s.defaultRestSeconds)

  const locale = SUPPORTED_LOCALES.includes(s.locale) ? s.locale : 'en'

  return {
    ...s,
    locale,
    mealCalendarPlatform: normalizeMealCalendarPlatform(
      s.mealCalendarPlatform || detectMealCalendarPlatform()
    ),
    defaultRestSeconds: Number.isFinite(rest) && rest >= 15 ? Math.min(rest, 600) : 60,
    autoStartRestOnComplete: s.autoStartRestOnComplete !== false,
    restTimerSound: s.restTimerSound !== false,
    restTimerVibrate: s.restTimerVibrate !== false,
    enableSetLogging: s.enableSetLogging === true,
    mealReminderMethod,
    mealCalendarRemindersSetUp: s.mealCalendarRemindersSetUp === true,
    mealRemindersEnabled: s.mealRemindersEnabled === true,
    mealRemindersVibrate: s.mealRemindersVibrate !== false,
    mealReminderTimes,
    geminiApiKey: typeof s.geminiApiKey === 'string' ? s.geminiApiKey.trim() : '',
    geminiModel: typeof s.geminiModel === 'string' ? s.geminiModel.trim() : '',
    waterGoalCups: Number.isFinite(Number(s.waterGoalCups)) && Number(s.waterGoalCups) >= 1
      ? Math.min(Math.round(Number(s.waterGoalCups)), 20)
      : 8,
  }
}

export function getAppSettings(state) {
  return normalizeAppSettings(state?.appSettings)
}

export function updateAppSettings(state, patch) {
  return {
    appSettings: normalizeAppSettings({
      ...getAppSettings(state),
      ...patch,
    }),
  }
}
