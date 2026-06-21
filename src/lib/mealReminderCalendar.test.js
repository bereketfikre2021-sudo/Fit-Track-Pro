import { describe, it, expect } from 'vitest'
import { buildMealRemindersIcs, MEAL_REMINDER_CALENDAR_DAYS } from './mealReminderCalendar'
import { DEFAULT_APP_SETTINGS } from './appSettings'

describe('mealReminderCalendar', () => {
  it('emits one explicit event per meal slot per day (all 7 weekdays)', () => {
    const now = new Date(2026, 5, 4, 10, 0, 0) // Wednesday
    const daysAhead = 7
    const ics = buildMealRemindersIcs(DEFAULT_APP_SETTINGS, { now, daysAhead })
    const slotCount = Object.keys(DEFAULT_APP_SETTINGS.mealReminderTimes).length
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(eventCount).toBe(slotCount * daysAhead)
    expect(ics).toContain('FitTrack Pro · Breakfast')
    expect(ics).toContain('DTSTART:')
    expect(ics).toContain('DTEND:')
    expect(ics).not.toContain('RRULE:')
    expect(ics).toContain('UID:fittrack-meal-breakfast-20260604@fittrack-pro')
    expect(ics).toContain('UID:fittrack-meal-breakfast-20260610@fittrack-pro')
    expect(ics).toContain('BEGIN:VALARM')
  })

  it('defaults to one year of daily coverage', () => {
    const slotCount = Object.keys(DEFAULT_APP_SETTINGS.mealReminderTimes).length
    const ics = buildMealRemindersIcs(DEFAULT_APP_SETTINGS, {
      now: new Date(2026, 5, 4, 10, 0, 0),
      daysAhead: MEAL_REMINDER_CALENDAR_DAYS,
    })
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length
    expect(eventCount).toBe(slotCount * MEAL_REMINDER_CALENDAR_DAYS)
  })

  it('includes breakfast on each day in the range starting today', () => {
    const now = new Date(2026, 5, 4, 8, 0, 0)
    const ics = buildMealRemindersIcs(DEFAULT_APP_SETTINGS, { now, daysAhead: 3 })
    expect(ics).toContain('DTSTART:20260604T070000')
    expect(ics).toContain('DTSTART:20260605T070000')
    expect(ics).toContain('DTSTART:20260606T070000')
  })
})
