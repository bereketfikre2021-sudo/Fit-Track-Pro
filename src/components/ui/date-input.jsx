import * as React from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

function openNativeDatePicker(input) {
  if (typeof input?.showPicker !== 'function') return
  try {
    input.showPicker()
  } catch {
    /* Already open or blocked — ignore */
  }
}

const DateInput = React.forwardRef(({ className, onClick, onFocus, ...props }, ref) => {
  const handleActivate = (e) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      openNativeDatePicker(e.currentTarget)
    }
  }

  return (
    <div className="relative w-full">
      <input
        type="date"
        ref={ref}
        className={cn(
          'date-input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={handleActivate}
        onFocus={(e) => {
          onFocus?.(e)
          openNativeDatePicker(e.currentTarget)
        }}
        {...props}
      />
      <Calendar
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
})
DateInput.displayName = 'DateInput'

export { DateInput }
