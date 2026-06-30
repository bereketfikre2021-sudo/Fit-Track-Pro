import { useState } from 'react'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { translateWeekday } from '@/lib/i18nHelpers'

function CopyDayDialog({ open, onOpenChange, fromDay, workoutDays, exerciseCount, onCopy }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState([])
  const [replace, setReplace] = useState(false)

  const toggle = (day) => {
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleCopy = () => {
    if (selected.length === 0) return
    onCopy(selected, replace)
    setSelected([])
    setReplace(false)
    onOpenChange(false)
  }

  const targets = workoutDays.filter((d) => d !== fromDay)
  const fromDayLabel = translateWeekday(fromDay)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {t('dialogs.copyDay.title', { day: fromDayLabel })}
          </DialogTitle>
          <DialogDescription>
            {t('dialogs.copyDay.description', { count: exerciseCount })}
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dialogs.copyDay.noTargets')}</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {targets.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggle(day)}
                  className={cn(
                    'w-full text-left rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                    selected.includes(day)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {translateWeekday(day)}
                </button>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span className="text-muted-foreground">
                {t('dialogs.copyDay.replaceCheckbox')}
              </span>
            </label>

            <Button className="w-full" disabled={selected.length === 0} onClick={handleCopy}>
              {t('dialogs.copyDay.copyTo', { count: selected.length })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CopyDayDialog
