import * as React from 'react'
import { cn } from '@/lib/utils'

/* ─── Constants ──────────────────────────────────────────────────────────── */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const ITEM_H = 44 // px — height of each drum-roll item

function daysInMonth(month, year) {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function parseValue(value) {
  if (!value || typeof value !== 'string') return { year: null, month: null, day: null }
  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return { year: null, month: null, day: null }
  return { year: parts[0], month: parts[1], day: parts[2] }
}

/* ─── Single drum-roll column ────────────────────────────────────────────── */

function DrumColumn({ items, selectedIndex, onSelect, formatLabel, width = 'flex-1' }) {
  const listRef = React.useRef(null)
  const isScrollingRef = React.useRef(false)
  const pendingRef = React.useRef(null)

  // Scroll to selected item whenever it changes
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const target = selectedIndex * ITEM_H
    if (Math.abs(el.scrollTop - target) < 2) return
    el.scrollTo({ top: target, behavior: 'smooth' })
  }, [selectedIndex])

  const handleScroll = () => {
    if (pendingRef.current) clearTimeout(pendingRef.current)
    isScrollingRef.current = true
    pendingRef.current = setTimeout(() => {
      isScrollingRef.current = false
      const el = listRef.current
      if (!el) return
      const idx = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      // Snap to nearest item
      el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      onSelect(clamped)
    }, 120)
  }

  return (
    <div className={cn('relative overflow-hidden', width)} style={{ height: ITEM_H * 5 }}>
      {/* Selection highlight band */}
      <div
        className="pointer-events-none absolute inset-x-0 z-10 rounded-md border border-primary/40 bg-primary/10"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />

      {/* Top + bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-background to-transparent" />

      {/* Scrollable list */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          /* Hide scrollbar cross-browser */
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top padding so first item can center */}
        <div style={{ height: ITEM_H * 2 }} />

        {items.map((item, i) => {
          const isSelected = i === selectedIndex
          return (
            <div
              key={i}
              onClick={() => {
                listRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
                onSelect(i)
              }}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className={cn(
                'flex items-center justify-center cursor-pointer select-none transition-all duration-150',
                isSelected
                  ? 'text-primary font-bold text-base'
                  : 'text-muted-foreground font-normal text-sm'
              )}
            >
              {formatLabel ? formatLabel(item, i) : item}
            </div>
          )
        })}

        {/* Bottom padding so last item can center */}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  )
}

/* ─── Main DateInput ─────────────────────────────────────────────────────── */

/**
 * Branded drum-roll date picker.
 * Interface: value="YYYY-MM-DD", onChange(e) where e.target.value = "YYYY-MM-DD"
 */
const DateInput = React.forwardRef(function DateInput(
  { className, value, onChange, disabled },
  ref
) {
  const parsed = parseValue(value)

  const currentYear = new Date().getFullYear()
  // Years: from current year down to 100 years ago
  const years = React.useMemo(
    () => Array.from({ length: 101 }, (_, i) => currentYear - i),
    [currentYear]
  )

  // Derive selected indices
  const yearIdx = parsed.year != null
    ? years.indexOf(parsed.year)
    : Math.max(0, years.indexOf(currentYear - 25)) // default ~25 years old
  const monthIdx = parsed.month != null ? parsed.month - 1 : 0
  const maxDay = daysInMonth(
    parsed.month || 1,
    parsed.year || currentYear
  )
  const days = React.useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay]
  )
  const dayIdx = parsed.day != null
    ? Math.min(parsed.day - 1, maxDay - 1)
    : 0

  const emit = (y, m, d) => {
    if (!onChange) return
    const yy = years[y] ?? years[0]
    const mm = m + 1
    const dd = d + 1
    onChange({ target: { value: `${yy}-${pad(mm)}-${pad(dd)}` } })
  }

  const handleYear = (i) => emit(i, monthIdx, dayIdx)
  const handleMonth = (i) => {
    // Clamp day if new month has fewer days
    const newMax = daysInMonth(i + 1, years[yearIdx] || currentYear)
    const clampedDay = Math.min(dayIdx, newMax - 1)
    emit(yearIdx, i, clampedDay)
  }
  const handleDay = (i) => emit(yearIdx, monthIdx, i)

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-1 rounded-lg border border-input bg-background px-1 py-1',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Day */}
      <DrumColumn
        items={days}
        selectedIndex={dayIdx}
        onSelect={handleDay}
        formatLabel={(d) => pad(d)}
        width="w-12 shrink-0"
      />

      {/* Divider */}
      <div className="w-px bg-border/40 self-stretch my-3" />

      {/* Month */}
      <DrumColumn
        items={MONTHS}
        selectedIndex={monthIdx}
        onSelect={handleMonth}
        width="flex-1"
      />

      {/* Divider */}
      <div className="w-px bg-border/40 self-stretch my-3" />

      {/* Year */}
      <DrumColumn
        items={years}
        selectedIndex={yearIdx < 0 ? 25 : yearIdx}
        onSelect={handleYear}
        formatLabel={(y) => String(y)}
        width="w-16 shrink-0"
      />
    </div>
  )
})

DateInput.displayName = 'DateInput'

export { DateInput }
