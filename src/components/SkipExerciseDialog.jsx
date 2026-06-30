import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { getSkipReasons } from '@/lib/exerciseSkip'
import { cn } from '@/lib/utils'

function SkipExerciseDialog({ open, onOpenChange, exerciseName, onConfirm }) {
  const { t } = useTranslation()
  const skipReasons = getSkipReasons()
  const [reason, setReason] = useState('busy')

  const handleOpenChange = (next) => {
    if (!next) setReason('busy')
    onOpenChange(next)
  }

  const handleConfirm = () => {
    onConfirm(reason)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('dialogs.skip.title')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.skip.description', { name: exerciseName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {skipReasons.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setReason(option.value)}
              className={cn(
                'w-full text-left rounded-lg border p-3 text-sm transition-colors',
                reason === option.value
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm}>{t('dialogs.skip.skipForToday')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SkipExerciseDialog
