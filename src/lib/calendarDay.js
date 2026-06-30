const CALENDAR_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function getCalendarDayName(date = new Date()) {
  return CALENDAR_DAYS[date.getDay()]
}

/** Weekday name for a local YYYY-MM-DD string (not UTC-parsed). */
export function getCalendarDayNameForDateString(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number)
  return CALENDAR_DAYS[new Date(y, m - 1, day).getDay()]
}

/** Plan day matches the calendar weekday of the completion date. */
export function isPlanDayAlignedWithDate(planDay, dateStr) {
  return planDay === getCalendarDayNameForDateString(dateStr)
}

/**
 * True when a completion belongs on its calendar day and (if configured) that day is a scheduled workout day.
 * Off-schedule work (e.g. Tuesday plan logged on Wednesday) is excluded from reports.
 */
export function isAlignedWorkoutCompletion(entry, workoutDays = []) {
  if (!entry?.date || !entry?.day || entry.skipped || !entry.completedAt) return false
  if (!isPlanDayAlignedWithDate(entry.day, entry.date)) return false
  if (workoutDays.length > 0) {
    return workoutDays.includes(getCalendarDayNameForDateString(entry.date))
  }
  return true
}

/** Next scheduled workout day after today (wraps week). */
export function getNextWorkoutDay(workoutDays, fromDate = new Date()) {
  if (!workoutDays?.length) return null
  const startIdx = fromDate.getDay()
  for (let i = 0; i < 7; i++) {
    const name = CALENDAR_DAYS[(startIdx + i) % 7]
    if (workoutDays.includes(name)) return name
  }
  return workoutDays[0]
}

export function getTodayWorkoutContext(workoutDays, referenceDate = new Date()) {
  const calendarToday = getCalendarDayName(referenceDate)
  const isTrainingDay = workoutDays?.includes(calendarToday)

  return {
    calendarToday,
    planDay: isTrainingDay ? calendarToday : null,
    isRestDay: workoutDays?.length > 0 && !isTrainingDay,
    nextWorkoutDay: isTrainingDay ? calendarToday : getNextWorkoutDay(workoutDays, referenceDate),
  }
}

/** True only when the calendar day matches a scheduled workout day for that plan day. */
export function canStartWorkoutForDay(day, workoutDays, referenceDate = new Date()) {
  const ctx = getTodayWorkoutContext(workoutDays, referenceDate)
  return ctx.planDay === day
}
