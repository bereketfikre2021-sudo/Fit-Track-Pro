import { getCalendarDayName } from './calendarDay'

/** Motivation quote lines — highlight is styled in primary color on the home page. */
export const DAILY_MOTIVATION = {
  Monday: [
    { before: 'Start with ', highlight: 'intention', after: '.' },
    { before: 'Finish with ', highlight: 'pride', after: '.' },
  ],
  Tuesday: [
    { before: 'Small ', highlight: 'steps', after: '.' },
    { before: 'Big ', highlight: 'results', after: '.' },
  ],
  Wednesday: [
    { before: 'Train with ', highlight: 'purpose', after: '.' },
    { before: 'Track your ', highlight: 'progress', after: '.' },
  ],
  Thursday: [
    { before: 'Stay ', highlight: 'consistent', after: '.' },
    { before: 'Trust the ', highlight: 'process', after: '.' },
  ],
  Friday: [
    { before: 'One more ', highlight: 'rep', after: '.' },
    { before: 'One step ', highlight: 'closer', after: '.' },
  ],
  Saturday: [
    { before: 'Strong ', highlight: 'habits', after: '.' },
    { before: '', highlight: 'Stronger', after: ' you.' },
  ],
  Sunday: [
    { before: 'Recover ', highlight: 'well', after: '.' },
    { before: 'Rise ', highlight: 'stronger', after: '.' },
  ],
}

export function getDailyMotivation(date = new Date()) {
  const day = getCalendarDayName(date)
  return DAILY_MOTIVATION[day] ?? DAILY_MOTIVATION.Wednesday
}
