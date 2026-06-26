import { useState } from 'react'
import { GripVertical, Trash2, Edit2, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { cn } from '@/lib/utils'
import { formatExerciseTarget, buildExerciseTarget, normalizeHoldFields } from '@/lib/exerciseFormat'
import { EXERCISE_PHASE, inferExercisePhase, getExercisePhaseLabel } from '@/lib/exercisePhase'

/** Small dialog to edit the per-day sets / reps / rest for a scheduled exercise. */
function EditScheduleEntryDialog({ exercise, onClose, onSave }) {
  const { t } = useTranslation()
  const isTimeBased = exercise.isTimeBased ?? false

  const [sets, setSets] = useState(String(exercise.sets ?? '3'))
  const [reps, setReps] = useState(String(exercise.reps ?? '10'))
  const [duration, setDuration] = useState(String(exercise.duration ?? '30'))
  const [durationUnit, setDurationUnit] = useState(exercise.durationUnit ?? 'seconds')
  const [restTime, setRestTime] = useState(String(exercise.restTime ?? '60'))

  const handleSave = () => {
    const normalized = normalizeHoldFields({
      ...exercise,
      sets,
      reps,
      duration,
      durationUnit,
      restTime,
      isTimeBased,
    })
    onSave({
      ...normalized,
      target: buildExerciseTarget({
        isTimeBased,
        sets: normalized.sets,
        reps: normalized.reps,
        duration: normalized.duration,
        durationUnit: normalized.durationUnit,
      }),
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="truncate">{exercise.name}</DialogTitle>
          <DialogDescription>
            {t('custom.editScheduleEntryDesc', {
              defaultValue: 'Adjust sets, reps, and rest time for this day.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Sets */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {isTimeBased
                ? t('dialogs.addToDay.setsOptional', { defaultValue: 'Sets (optional)' })
                : t('custom.sets', { defaultValue: 'Sets' })}
            </label>
            <Input
              type="number"
              min={isTimeBased ? '0' : '1'}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder={isTimeBased ? '0' : '3'}
            />
          </div>

          {/* Reps or Duration */}
          {isTimeBased ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  {t('dialogs.addToDay.repsOptional', { defaultValue: 'Reps (optional)' })}
                </label>
                <Input
                  placeholder="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('custom.duration', { defaultValue: 'Duration' })}</label>
                <Input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('custom.unit', { defaultValue: 'Unit' })}</label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="seconds">{t('durationUnits.seconds', { defaultValue: 'Seconds' })}</option>
                  <option value="minutes">{t('durationUnits.minutes', { defaultValue: 'Minutes' })}</option>
                </select>
              </div>
            </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('custom.reps', { defaultValue: 'Reps' })}</label>
              <Input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="10"
              />
            </div>
          )}

          {/* Rest Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('custom.restTimeSec', { defaultValue: 'Rest Time (seconds)' })}
            </label>
            <Input
              type="number"
              min="0"
              step="5"
              value={restTime}
              onChange={(e) => setRestTime(e.target.value)}
              placeholder="60"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1.5" />
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleExerciseList({ exercises, onReorder, onRemove, onUpdate }) {
  const { t } = useTranslation()
  const [dragIndex, setDragIndex] = useState(null)
  const [editingExercise, setEditingExercise] = useState(null)

  const handleDragStart = (index) => setDragIndex(index)

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    onReorder(dragIndex, index)
    setDragIndex(index)
  }

  const handleDragEnd = () => setDragIndex(null)

  if (!exercises?.length) return null

  const items = exercises.map((ex, originalIndex) => ({
    ex,
    originalIndex,
    phase: inferExercisePhase(ex),
  }))

  const groups = [EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.MAIN, EXERCISE_PHASE.COOLDOWN].map(
    (phase) => ({
      phase,
      label: getExercisePhaseLabel(phase),
      items: items.filter((i) => i.phase === phase),
    })
  )

  return (
    <>
      <div className="space-y-2">
        {groups.map((group) => {
          if (group.items.length === 0) return null
          return (
            <div key={group.phase} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {group.label}
              </p>
              {group.items.map(({ ex, originalIndex }) => (
                <div
                  key={ex.id}
                  draggable
                  onDragStart={() => handleDragStart(originalIndex)}
                  onDragOver={(e) => handleDragOver(e, originalIndex)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-opacity',
                    dragIndex === originalIndex && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ex.target || formatExerciseTarget(ex)}
                    </p>
                  </div>

                  {/* Edit button — only shown when onUpdate is provided */}
                  {onUpdate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => setEditingExercise(ex)}
                      aria-label={t('custom.editScheduleEntry', { defaultValue: 'Edit sets & reps' })}
                      title={t('custom.editScheduleEntry', { defaultValue: 'Edit sets & reps' })}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}

                  {onRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onRemove(ex.id)}
                      aria-label={t('custom.removeFromDay')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
        <p className="text-[10px] text-muted-foreground text-center">
          {t('custom.dragReorder')}
        </p>
      </div>

      {editingExercise && (
        <EditScheduleEntryDialog
          exercise={editingExercise}
          onClose={() => setEditingExercise(null)}
          onSave={(updated) => {
            onUpdate(updated)
            setEditingExercise(null)
          }}
        />
      )}
    </>
  )
}

export default ScheduleExerciseList
