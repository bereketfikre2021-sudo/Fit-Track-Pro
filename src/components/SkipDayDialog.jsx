/**
 * SkipDayDialog — redesigned
 *
 * Step 1: Pick a reason
 *   - Injury / Pain
 *   - Short on time
 *   - Transfer to another day
 *
 * Step 2 (only when "Transfer" chosen): Pick a rest day from this week
 *
 * Callbacks:
 *   onConfirm(reason)       — actual skip
 *   onTransfer(targetDay)   — transfer (does NOT mark as skipped)
 */

import { useState } from 'react'
import { ArrowRight, Calendar, Clock, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

function getUpcomingRestDays(todayName, workoutDays) {
  const todayIdx = DAYS_OF_WEEK.indexOf(todayName)
  if (todayIdx === -1) return []
  const upcoming = []
  for (let i = 1; i <= 6; i++) {
    const day = DAYS_OF_WEEK[(todayIdx + i) % 7]
    if (!workoutDays.includes(day)) upcoming.push(day)
  }
  return upcoming
}

function SkipDayDialog({ open, onOpenChange, dayLabel, todayName, workoutDays = [], onConfirm, onTransfer }) {
  const { t } = useTranslation()
  const [step, setStep]           = useState('reason')
  const [reason, setReason]       = useState(null)
  const [targetDay, setTargetDay] = useState(null)

  const restDays = getUpcomingRestDays(todayName || 'Monday', workoutDays)

  // Build options using translated strings
  const SKIP_OPTIONS = [
    {
      value: 'injury',
      label: t('dialogs.skipDay.reasonInjury'),
      description: t('dialogs.skipDay.reasonInjuryDesc'),
      icon: AlertCircle,
      isTransfer: false,
    },
    {
      value: 'busy',
      label: t('dialogs.skipDay.reasonBusy'),
      description: t('dialogs.skipDay.reasonBusyDesc'),
      icon: Clock,
      isTransfer: false,
    },
    {
      value: 'transfer',
      label: t('dialogs.skipDay.reasonTransfer'),
      description: t('dialogs.skipDay.reasonTransferDesc'),
      icon: ArrowRight,
      isTransfer: true,
    },
  ]

  const handleClose = () => {
    setStep('reason')
    setReason(null)
    setTargetDay(null)
    onOpenChange(false)
  }

  const handleOptionSelect = (option) => {
    setReason(option.value)
    if (option.isTransfer) setStep('transfer')
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
                {t('dialogs.skipDay.title', { day: dayLabel })}
              </DialogTitle>
              <DialogDescription>
                {t('dialogs.skipDay.chooseReason')}
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

            {reason && reason !== 'transfer' && (
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  {t('dialogs.skipDay.cancel')}
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleConfirmSkip}>
                  {t('dialogs.skipDay.skipWorkout')}
                </Button>
              </div>
            )}

            {!reason && (
              <Button variant="outline" className="w-full" onClick={handleClose}>
                {t('dialogs.skipDay.cancel')}
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
                {t('dialogs.skipDay.transferTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('dialogs.skipDay.transferDesc', { day: dayLabel })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {restDays.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('dialogs.skipDay.noRestDays')}
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
                    <span className="text-xs text-muted-foreground font-normal">
                      {t('dialogs.skipDay.restDayLabel')}
                    </span>
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
                {t('dialogs.skipDay.back')}
              </Button>
              <Button
                className="flex-1"
                disabled={!targetDay}
                onClick={handleConfirmTransfer}
              >
                {targetDay
                  ? t('dialogs.skipDay.transferTo', { day: translateWeekday(targetDay) })
                  : t('dialogs.skipDay.transferPending')}
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}

export default SkipDayDialog
