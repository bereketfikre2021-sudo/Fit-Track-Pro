/**
 * SkipDayDialog — redesigned
 *
 * Step 1: Pick a reason
 *   - Injury / Pain
 *   - Short on time
 *   - Transfer to another day   ← new option (replaces "Equipment unavailable")
 *
 * Step 2 (only when "Transfer" chosen): Pick a rest day from this week
 *   Shows the user's upcoming rest days (days NOT in workoutDays).
 *   Selecting one schedules the workout there instead of skipping it.
 *
 * Callbacks:
 *   onConfirm(reason)           — actual skip (marks session skipped)
 *   onTransfer(targetDay)       — transfer (does NOT mark as skipped)
 */

import { useState } from 'react'
import { ArrowRight, Calendar, Clock, AlertCircle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { translateWeekday } from '@/lib/i18nHelpers'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Days from today (inclusive of tomorrow) up to and including next Sunday
function getUpcomingRestDays(todayName, workoutDays) {
  const todayIdx = DAYS_OF_WEEK.indexOf(todayName)
  if (todayIdx === -1) return []

  const upcoming = []
  // Check the next 6 days (tomorrow through +6)
  for (let i = 1; i <= 6; i++) {
    const day = DAYS_OF_WEEK[(todayIdx + i) % 7]
    if (!workoutDays.includes(day)) {
      upcoming.push(day)
    }
  }
  return upcoming
}

const SKIP_OPTIONS = [
  {
    value: 'injury',
    label: 'Injury / Pain',
    description: 'Your body needs recovery time',
    icon: AlertCircle,
    isTransfer: false,
  },
  {
    value: 'busy',
    label: 'Short on time',
    description: "Can't fit it in today",
    icon: Clock,
    isTransfer: false,
  },
  {
    value: 'transfer',
    label: 'Transfer to a rest day',
    description: 'Move this workout to another day this week',
    icon: ArrowRight,
    isTransfer: true,
  },
]

function SkipDayDialog({ open, onOpenChange, dayLabel, todayName, workoutDays = [], onConfirm, onTransfer }) {
  const [step, setStep]           = useState('reason')   // 'reason' | 'transfer'
  const [reason, setReason]       = useState(null)
  const [targetDay, setTargetDay] = useState(null)

  const restDays = getUpcomingRestDays(todayName || 'Monday', workoutDays)

  const handleClose = () => {
    setStep('reason')
    setReason(null)
    setTargetDay(null)
    onOpenChange(false)
  }

  const handleOptionSelect = (option) => {
    setReason(option.value)
    if (option.isTransfer) {
      setStep('transfer')
    }
  }

  const handleConfirmSkip = () => {
    if (!reason) return
    onConfirm(reason)
    handleClose()
  }

  const handleConfirmTransfer = () => {
    if (!targetDay) return
    onTransfer?.(targetDay)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">

        {/* ── Step 1: Choose reason ── */}
        {step === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" aria-hidden />
                Skip {dayLabel}?
              </DialogTitle>
              <DialogDescription>
                Choose a reason or transfer this workout to a rest day this week.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {SKIP_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = reason === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors',
                      'flex items-start gap-3',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4 mt-0.5 shrink-0',
                      option.isTransfer ? 'text-primary' : 'text-muted-foreground'
                    )} aria-hidden />
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        option.isTransfer && 'text-primary'
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    {option.isTransfer && (
                      <ArrowRight className="h-4 w-4 text-primary ml-auto mt-0.5 shrink-0" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Only show confirm button for non-transfer options */}
            {reason && reason !== 'transfer' && (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleConfirmSkip}>
                  Skip workout
                </Button>
              </div>
            )}

            {!reason && (
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            )}
          </>
        )}

        {/* ── Step 2: Pick rest day ── */}
        {step === 'transfer' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
                Transfer to a rest day
              </DialogTitle>
              <DialogDescription>
                Pick an upcoming rest day to do {dayLabel}&apos;s workout instead.
                Your streak and progress stay intact.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {restDays.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No rest days available this week — all days are scheduled workout days.
                  </p>
                </div>
              ) : (
                restDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setTargetDay(day)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 text-sm font-medium transition-colors',
                      'flex items-center justify-between',
                      targetDay === day
                        ? 'border-primary bg-primary/10 ring-1 ring-primary text-primary'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    )}
                  >
                    <span>{translateWeekday(day)}</span>
                    <span className="text-xs text-muted-foreground font-normal">Rest day</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep('reason'); setTargetDay(null) }}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!targetDay}
                onClick={handleConfirmTransfer}
              >
                Transfer to {targetDay ? translateWeekday(targetDay) : '…'}
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}

export default SkipDayDialog
