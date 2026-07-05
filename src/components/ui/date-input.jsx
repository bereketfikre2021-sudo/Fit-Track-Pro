import * as React from 'react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month, year) {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

function parseValue(value) {
  if (!value || typeof value !== 'string') return { year: '', month: '', day: '' }
  const parts = value.split('-')
  if (parts.length !== 3) return { year: '', month: '', day: '' }
  return { year: parts[0], month: parts[1], day: parts[2] }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

const selectClass = cn(
  'flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-2 text-sm',
  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
  'text-foreground appearance-none cursor-pointer',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

/**
 * Branded date picker — three dropdowns (Day / Month / Year) styled with
 * the app's design tokens instead of the native browser date widget.
 *
 * Interface matches <input type="date"> so existing code using
 * onChange with e.target.value still works.
 */
const DateInput = React.forwardRef(({ className, value, onChange, disabled, required, ...rest }, ref) => {
  const parsed = parseValue(value)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)
  const monthNum = parseInt(parsed.month, 10)
  const yearNum = parseInt(parsed.year, 10)
  const maxDays = daysInMonth(monthNum || 1, yearNum || currentYear)
  const days = Array.from({ length: maxDays }, (_, i) => i + 1)

  const emit = (next) => {
    if (!onChange) return
    const { year, month, day } = next
    const dateStr = (year && month && day) ? `${year}-${pad(month)}-${pad(day)}` : ''
    // Synthetic event shape that matches native input onChange
    onChange({ target: { value: dateStr } })
  }

  const handleMonth = (e) => {
    const m = e.target.value
    // Clamp day if it would exceed new month length
    const maxD = daysInMonth(parseInt(m, 10), yearNum || currentYear)
    const d = parsed.day && parseInt(parsed.day, 10) > maxD ? String(maxD) : parsed.day
    emit({ year: parsed.year, month: m, day: d })
  }

  const handleDay = (e) => {
    emit({ year: parsed.year, month: parsed.month, day: e.target.value })
  }

  const handleYear = (e) => {
    emit({ year: e.target.value, month: parsed.month, day: parsed.day })
  }

  return (
    <div
      ref={ref}
      className={cn('flex gap-1.5 w-full', className)}
      {...rest}
    >
      {/* Day */}
      <select
        value={parsed.day}
        onChange={handleDay}
        disabled={disabled}
        required={required}
        aria-label="Day"
        className={selectClass}
      >
        <option value="">DD</option>
        {days.map((d) => (
          <option key={d} value={pad(d)}>{d}</option>
        ))}
      </select>

      {/* Month */}
      <select
        value={parsed.month}
        onChange={handleMonth}
        disabled={disabled}
        required={required}
        aria-label="Month"
        className={cn(selectClass, 'flex-[2]')}
      >
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={pad(i + 1)}>{name}</option>
        ))}
      </select>

      {/* Year */}
      <select
        value={parsed.year}
        onChange={handleYear}
        disabled={disabled}
        required={required}
        aria-label="Year"
        className={cn(selectClass, 'flex-[1.5]')}
      >
        <option value="">YYYY</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  )
})

DateInput.displayName = 'DateInput'

export { DateInput }
