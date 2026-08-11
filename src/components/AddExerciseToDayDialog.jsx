import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatExerciseTarget, getDurationLabel, isHoldExercise, normalizeHoldFields } from '@/lib/exerciseFormat'
import {
  EXERCISE_PHASE_OPTIONS,
  getExercisePhaseLabel,
  inferExercisePhase,
} from '@/lib/exercisePhase'
import { filterExerciseLibrary } from '@/lib/exerciseSearch'
import { EXERCISE_CATEGORIES } from '@/lib/exerciseTaxonomy'
import { displayCategory, displayEquipment } from '@/lib/exerciseFilterDisplay'
import { translateWeekday } from '@/lib/i18nHelpers'
import ExercisePickerRow from './ExercisePickerRow'
import { FULLSCREEN_DIALOG_CONTENT_CLASS } from './dialogStyles'
import ExerciseDetailSheet from './ExerciseDetailSheet'
import { useLocalizedName } from '@/lib/localizedField'

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const CATEGORY_TABS = ['all', ...EXERCISE_CATEGORIES]
const PHASE_TABS = ['all', ...EXERCISE_PHASE_OPTIONS.map((o) => o.value)]

/** Build default field values for one exercise from its library entry. */
function defaultFields(ex) {
  const hold = isHoldExercise(ex)
  return {
    sets: hold ? (ex.sets ?? '0') : (ex.sets || '3'),
    reps: hold ? (ex.reps ?? '0') : (ex.reps || '10'),
    duration: ex.duration || '30',
    durationUnit: ex.durationUnit || 'seconds',
    weightKg: '',
    isHold: hold,
    expanded: false,
  }
}

function AddExerciseToDayDialog({ day, customExercises, onClose, onAdd }) {
  const { t } = useTranslation()
  const getLocalizedName = useLocalizedName()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')
  // Map of exerciseId -> field config for each selected exercise
  const [selections, setSelections] = useState({})
  const [detailExercise, setDetailExercise] = useState(null)

  const filteredExercises = useMemo(
    () =>
      filterExerciseLibrary(customExercises, {
        searchQuery,
        categoryFilter: categoryFilter === 'all' ? '' : categoryFilter,
        phase: phaseFilter === 'all' ? undefined : phaseFilter,
        sortBy: 'name',
      }),
    [customExercises, searchQuery, categoryFilter, phaseFilter]
  )

  const selectedIds = Object.keys(selections)
  const selectedCount = selectedIds.length

  const toggleExercise = (ex) => {
    setSelections((prev) => {
      if (prev[ex.id]) {
        const next = { ...prev }
        delete next[ex.id]
        return next
      }
      return { ...prev, [ex.id]: defaultFields(ex) }
    })
  }

  const updateField = (exId, field, value) => {
    setSelections((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], [field]: value },
    }))
  }

  const toggleExpanded = (exId) => {
    setSelections((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], expanded: !prev[exId].expanded },
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedCount === 0) {
      toast.error(t('dialogs.addToDay.toastSelect'))
      return
    }

    let hasError = false
    for (const exId of selectedIds) {
      const fields = selections[exId]
      if (fields.isHold) {
        if (!fields.duration || Number(fields.duration) <= 0) {
          const ex = customExercises.find((e) => e.id === exId)
          toast.error(`${ex?.name ?? exId}: ${t('dialogs.addToDay.toastDuration')}`)
          hasError = true
          break
        }
      } else {
        if (!fields.sets || Number(fields.sets) <= 0) {
          const ex = customExercises.find((e) => e.id === exId)
          toast.error(`${ex?.name ?? exId}: ${t('dialogs.addToDay.toastSets')}`)
          hasError = true
          break
        }
        if (!fields.reps?.toString().trim()) {
          const ex = customExercises.find((e) => e.id === exId)
          toast.error(`${ex?.name ?? exId}: ${t('dialogs.addToDay.toastReps')}`)
          hasError = true
          break
        }
      }
    }
    if (hasError) return

    const entries = selectedIds.map((exId) => {
      const fields = selections[exId]
      return {
        exerciseId: exId,
        details: normalizeHoldFields({
          sets: fields.sets,
          reps: fields.reps,
          duration: fields.duration,
          durationUnit: fields.durationUnit,
          isTimeBased: fields.isHold,
          weightKg: fields.weightKg || '',
        }),
      }
    })

    onAdd(entries)
    onClose()
  }

  const categoryLabel = (value) => {
    if (value === 'all') return t('exercises.allCategories')
    return displayCategory(value, t)
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={FULLSCREEN_DIALOG_CONTENT_CLASS}>
          <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
            <DialogTitle className="text-base">
              {t('dialogs.addToDay.title', { day: translateWeekday(day) })}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('dialogs.addToDay.pickExercise')}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 space-y-2.5 border-b px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('exercises.searchPlaceholder')}
                className="h-9 pl-9 text-sm"
                aria-label={t('exercises.searchPlaceholder')}
              />
            </div>

            <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-4 gap-0.5 bg-muted/50 p-0.5">
                {CATEGORY_TABS.map((cat) => (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="h-7 px-1 text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {categoryLabel(cat)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-1">
              {PHASE_TABS.map((phase) => (
                <Button
                  key={phase}
                  type="button"
                  size="sm"
                  variant={phaseFilter === phase ? 'default' : 'outline'}
                  className="h-7 px-2 text-[10px] sm:text-xs"
                  onClick={() => setPhaseFilter(phase)}
                >
                  {phase === 'all'
                    ? t('exercises.allPhases')
                    : getExercisePhaseLabel(phase)}
                </Button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground">
              {t('exercises.shownSorted', { count: filteredExercises.length })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
              {filteredExercises.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {t('exercises.noMatch')}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredExercises.map((ex) => {
                    const phase = inferExercisePhase(ex)
                    const subtitle = [
                      displayCategory(ex.category || 'Strength', t),
                      ex.equipment ? displayEquipment(ex.equipment, t) : null,
                      formatExerciseTarget(ex),
                    ]
                      .filter(Boolean)
                      .join(' · ')

                    return (
                      <ExercisePickerRow
                        key={ex.id}
                        title={getLocalizedName(ex)}
                        subtitle={subtitle}
                        badges={[getExercisePhaseLabel(phase)]}
                        selected={!!selections[ex.id]}
                        imageUrl={ex.imageUrl || null}
                        onClick={() => toggleExercise(ex)}
                        trailing={
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailExercise(ex) }}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary transition-colors shrink-0"
                            title="Preview exercise"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        }
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom panel: selected exercise config + action buttons */}
            <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              {selectedCount > 0 && (
                <div className="mb-3 space-y-2 max-h-52 overflow-y-auto pr-0.5">
                  {selectedIds.map((exId) => {
                    const ex = customExercises.find((e) => e.id === exId)
                    if (!ex) return null
                    const fields = selections[exId]

                    return (
                      <div key={exId} className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
                        {/* Row header */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <p className="flex-1 text-sm font-medium truncate">{getLocalizedName(ex)}</p>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(exId)}
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            aria-label={fields.expanded ? 'Collapse' : 'Edit details'}
                          >
                            {fields.expanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleExercise(ex)}
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            aria-label="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Collapsed summary */}
                        {!fields.expanded && (
                          <p className="px-3 pb-2 text-[10px] text-muted-foreground">
                            {fields.isHold
                              ? `${fields.duration} ${fields.durationUnit}`
                              : [
                                  `${fields.sets} sets × ${fields.reps} reps`,
                                  fields.weightKg ? `${fields.weightKg} kg` : null,
                                ].filter(Boolean).join(' · ')}
                          </p>
                        )}

                        {/* Expanded fields */}
                        {fields.expanded && (
                          <div className="px-3 pb-3 space-y-2.5 border-t border-border/40 pt-2.5">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  {fields.isHold
                                    ? t('dialogs.addToDay.setsOptional', { defaultValue: 'Sets (optional)' })
                                    : t('dialogs.addToDay.sets')}
                                </label>
                                <Input
                                  type="number"
                                  min={fields.isHold ? '0' : '1'}
                                  placeholder={fields.isHold ? '0' : undefined}
                                  value={fields.sets}
                                  onChange={(e) => updateField(exId, 'sets', e.target.value)}
                                  className="h-8 text-sm"
                                  required={!fields.isHold}
                                />
                              </div>

                              {fields.isHold ? (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">
                                    {t('dialogs.addToDay.repsOptional')}
                                  </label>
                                  <Input
                                    placeholder="0"
                                    value={fields.reps}
                                    onChange={(e) => updateField(exId, 'reps', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">{t('dialogs.addToDay.reps')}</label>
                                  <Input
                                    placeholder="e.g., 10 or 8-12"
                                    value={fields.reps}
                                    onChange={(e) => updateField(exId, 'reps', e.target.value)}
                                    className="h-8 text-sm"
                                    required
                                  />
                                </div>
                              )}
                            </div>

                            {!fields.isHold && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Weight (kg) <span className="text-muted-foreground font-normal">(optional)</span>
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  placeholder="e.g. 60"
                                  value={fields.weightKg}
                                  onChange={(e) => updateField(exId, 'weightKg', e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}

                            {fields.isHold && (
                              <div className="grid grid-cols-2 gap-3">                                <div className="space-y-1">
                                  <label className="text-xs font-medium">
                                    {getDurationLabel(fields.durationUnit)} *
                                  </label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={fields.duration}
                                    onChange={(e) => updateField(exId, 'duration', e.target.value)}
                                    className="h-8 text-sm"
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">
                                    {t('dialogs.addToDay.durationUnit')}
                                  </label>
                                  <select
                                    value={fields.durationUnit}
                                    onChange={(e) => updateField(exId, 'durationUnit', e.target.value)}
                                    className={selectClassName}
                                    style={{ height: '2rem', fontSize: '0.875rem' }}
                                  >
                                    <option value="seconds">{t('durationUnits.seconds')}</option>
                                    <option value="minutes">{t('durationUnits.minutes')}</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9">
                  <X className="h-4 w-4 mr-1.5" />
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1 h-9" disabled={selectedCount === 0}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {selectedCount > 1
                    ? t('dialogs.addToDay.addCount', { count: selectedCount, defaultValue: `Add ${selectedCount} exercises` })
                    : t('exercises.addExercise')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ExerciseDetailSheet
        exercise={detailExercise}
        open={!!detailExercise}
        onClose={() => setDetailExercise(null)}
      />
    </>
  )
}

export default AddExerciseToDayDialog
