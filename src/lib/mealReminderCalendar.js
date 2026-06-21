/** Daily calendar events for meal reminder times (works when the app is closed). */



export const MEAL_SLOT_LABELS = {

  breakfast: 'Breakfast',

  morningSnack: 'Morning snack',

  lunch: 'Lunch',

  afternoonSnack: 'Afternoon snack',

  dinner: 'Dinner',

  beforeBed: 'Before bed',

}



/** Explicit per-day events — Samsung Calendar and many Android apps ignore RRULE. */

export const MEAL_REMINDER_CALENDAR_DAYS = 365



function parseHm(hm) {

  const m = String(hm || '').match(/^(\d{2}):(\d{2})$/)

  if (!m) return null

  const hh = Number(m[1])

  const mm = Number(m[2])

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null

  return { hh, mm }

}



function escapeIcsText(value) {

  return String(value || '')

    .replace(/\\/g, '\\\\')

    .replace(/;/g, '\\;')

    .replace(/,/g, '\\,')

    .replace(/\r?\n/g, '\\n')

}



function formatIcsStampUtc(date = new Date()) {

  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

}



function formatIcsLocalStart(date, hh, mm) {

  const y = date.getFullYear()

  const m = String(date.getMonth() + 1).padStart(2, '0')

  const d = String(date.getDate()).padStart(2, '0')

  return `${y}${m}${d}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`

}



function formatIcsLocalEnd(date, hh, mm, durationMinutes = 15) {

  const totalMinutes = hh * 60 + mm + durationMinutes

  const endH = Math.floor(totalMinutes / 60) % 24

  const endM = totalMinutes % 60

  return formatIcsLocalStart(date, endH, endM)

}



function formatIcsDateKey(date) {

  const y = date.getFullYear()

  const m = String(date.getMonth() + 1).padStart(2, '0')

  const d = String(date.getDate()).padStart(2, '0')

  return `${y}${m}${d}`

}



function startOfLocalDay(date = new Date()) {

  const d = new Date(date)

  d.setHours(0, 0, 0, 0)

  return d

}



function addLocalDays(date, days) {

  const d = new Date(date)

  d.setDate(d.getDate() + days)

  return d

}



export function buildMealRemindersIcs(settings, options = {}) {

  const times = settings?.mealReminderTimes || {}

  const now = options.now instanceof Date ? options.now : new Date()

  const daysAhead = options.daysAhead ?? MEAL_REMINDER_CALENDAR_DAYS

  const stamp = formatIcsStampUtc(now)

  const rangeStart = startOfLocalDay(now)

  const lines = [

    'BEGIN:VCALENDAR',

    'VERSION:2.0',

    'PRODID:-//FitTrack Pro//Meal Reminders//EN',

    'CALSCALE:GREGORIAN',

    'METHOD:PUBLISH',

  ]



  Object.entries(times).forEach(([slot, hm]) => {

    const parsed = parseHm(hm)

    if (!parsed) return

    const label = MEAL_SLOT_LABELS[slot] || 'Meal'

    const title = escapeIcsText(`FitTrack Pro · ${label}`)

    const description = escapeIcsText(

      `Daily meal reminder from FitTrack Pro (${label} at ${hm}). Open the app to see today's meal plan.`

    )



    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset += 1) {

      const eventDate = addLocalDays(rangeStart, dayOffset)

      const dateKey = formatIcsDateKey(eventDate)

      const dtstart = formatIcsLocalStart(eventDate, parsed.hh, parsed.mm)

      const dtend = formatIcsLocalEnd(eventDate, parsed.hh, parsed.mm)



      lines.push(

        'BEGIN:VEVENT',

        `UID:fittrack-meal-${slot}-${dateKey}@fittrack-pro`,

        `DTSTAMP:${stamp}`,

        `DTSTART:${dtstart}`,

        `DTEND:${dtend}`,

        `SUMMARY:${title}`,

        `DESCRIPTION:${description}`,

        'BEGIN:VALARM',

        'TRIGGER:-PT0M',

        'ACTION:DISPLAY',

        `DESCRIPTION:${title}`,

        'END:VALARM',

        'END:VEVENT'

      )

    }

  })



  lines.push('END:VCALENDAR')

  return `${lines.join('\r\n')}\r\n`

}



export function downloadMealRemindersCalendar(settings) {

  const ics = buildMealRemindersIcs(settings)

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })

  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')

  anchor.href = url

  anchor.download = 'fittrack-meal-reminders.ics'

  anchor.click()

  URL.revokeObjectURL(url)

  return ics

}

