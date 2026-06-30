import { describe, it, expect } from 'vitest'
import {
  normalizeAppSettings,
  getAppSettings,
  updateAppSettings,
  MEAL_REMINDER_METHOD,
} from './appSettings'

describe('appSettings', () => {
  it('updateAppSettings merges patch', () => {
    const next = updateAppSettings({ appSettings: {} }, { enableSetLogging: true })
    expect(next.appSettings.enableSetLogging).toBe(true)
  })

  it('enableSetLogging defaults off unless explicitly true', () => {
    expect(getAppSettings({}).enableSetLogging).toBe(false)
    expect(getAppSettings({ appSettings: { enableSetLogging: true } }).enableSetLogging).toBe(true)
  })

  it('defaults meal reminders to system calendar method', () => {
    const s = getAppSettings({})
    expect(s.mealReminderMethod).toBe(MEAL_REMINDER_METHOD.CALENDAR)
    expect(s.mealCalendarPlatform).toBeTruthy()
    expect(s.mealCalendarRemindersSetUp).toBe(false)
    expect(s.mealRemindersEnabled).toBe(false)
  })

  it('mealReminderTimes normalizes invalid values', () => {
    const s = normalizeAppSettings({
      mealReminderTimes: {
        breakfast: '7:0',
        lunch: '25:00',
        dinner: '19:30',
      },
    })
    expect(s.mealReminderTimes.dinner).toBe('19:30')
    // falls back to defaults
    expect(s.mealReminderTimes.breakfast).toBe('07:00')
    expect(s.mealReminderTimes.lunch).toBe('13:00')
  })
})
