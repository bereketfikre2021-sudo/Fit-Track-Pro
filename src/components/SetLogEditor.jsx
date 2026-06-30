import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { addSetRow, removeSetRow, updateSetRow } from '@/lib/setLogging'
import { cn } from '@/lib/utils'

function SetLogEditor({ sets, onChange, disabled = false, readOnly = false }) {
  const { t } = useTranslation()

  const handleUpdate = (setNumber, field, value) => {
    if (readOnly || !onChange) return
    onChange(updateSetRow(sets, setNumber, field, value))
  }

  const handleAdd = () => {
    if (readOnly || !onChange) return
    onChange(addSetRow(sets))
  }

  const handleRemove = (setNumber) => {
    if (readOnly || !onChange || sets.length <= 1) return
    onChange(removeSetRow(sets, setNumber))
  }

  if (!sets?.length) return null

  return (
    <div className="space-y-2 w-full">
      <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        <span>{t('setLog.set')}</span>
        <span>{t('setLog.kg')}</span>
        <span>{t('setLog.reps')}</span>
        <span className="sr-only">{t('setLog.remove')}</span>
      </div>
      {sets.map((set) => (
        <div
          key={set.setNumber}
          className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 items-center"
        >
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {set.setNumber}
          </span>
          {readOnly ? (
            <>
              <span className="text-xs text-muted-foreground tabular-nums px-2">
                {set.weightKg || '—'}
              </span>
              <span className="text-xs font-semibold tabular-nums px-2">{set.reps || '—'}</span>
            </>
          ) : (
            <>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={set.weightKg}
                onChange={(e) => handleUpdate(set.setNumber, 'weightKg', e.target.value)}
                className="h-8 text-xs tabular-nums"
                disabled={disabled}
              />
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={set.reps}
                onChange={(e) => handleUpdate(set.setNumber, 'reps', e.target.value)}
                className="h-8 text-xs font-semibold tabular-nums"
                disabled={disabled}
              />
            </>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleRemove(set.setNumber)}
              disabled={disabled || sets.length <= 1}
              aria-label={t('setLog.removeSet')}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
          {readOnly && <span />}
        </div>
      ))}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleAdd}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('setLog.addSet')}
        </Button>
      )}
    </div>
  )
}

export default SetLogEditor
