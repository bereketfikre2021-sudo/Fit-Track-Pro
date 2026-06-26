import { useEffect, useMemo, useState } from 'react'
import { Save, Search, X, Info } from 'lucide-react'
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
import { formatExerciseTarget, getDurationLabel, isHoldExercise } from '@/lib/exerciseFormat'
import {
  EXERCISE_PHASE,
  EXERCISE_PHASE_OPTIONS,
  getExercisePhaseLabel,
  inferExercisePhase,
  isSimplePhase,
} from '@/lib/exercisePhase'
import { filterExerciseLibrary } from '@/lib/exerciseSearch'
import { EXERCISE_CATEGORIES } from '@/lib/exerciseTaxonomy'
import { displayCategory, displayEquipment } from '@/lib/exerciseFilterDisplay'
import { translateWeekday } from '@/lib/i18nHelpers'
import ExercisePickerRow from './ExercisePickerRow'
import { FULLSCREEN_DIALOG_CONTENT_CLASS } from './dialogStyles'
import ExerciseDetailSheet from './ExerciseDetailSheet'

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const CATEGORY_TABS = ['all', ...EXERCISE_CATEGORIES]
const PHASE_TABS = ['all', ...EXERCISE_PHASE_OPTIONS.map((o) => o.value)]

function AddExerciseToDayDialog({ day, customExercises, onClose, onAdd }) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [detailExercise, setDetailExercise] = useState(null)
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [duration, setDuration] = useState('30')
  const [durationUnit, setDurationUnit] = useState('seconds')

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

  const selected = customExercises.find((ex) => ex.id === selectedExercise)
  const isHold = selected ? isHoldExercise(selected) : false

  useEffect(() => {
    if (!selected) return
    setSets(selected.sets || '3')
    setReps(selected.reps || (selected.isTimeBased ? '' : '10'))
    setDuration(selected.duration || '30')
    setDurationUnit(selected.durationUnit || 'seconds')
  }, [selected])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedExercise) {
      toast.error(t('dialogs.addToDay.toastSelect'))
      return
    }

    if (!sets || Number(sets) <= 0) {
      toast.error(t('dialogs.addToDay.toastSets'))
      return
    }

    if (isHold) {
      if (!duration || Number(duration) <= 0) {
        toast.error(t('dialogs.addToDay.toastDuration'))
        return
      }
    } else if (!reps?.toString().trim()) {
      toast.error(t('dialogs.addToDay.toastReps'))
      return
    }

    onAdd(selectedExercise, {
      sets,
      reps,
      duration,
      durationUnit,
      isTimeBased: isHold,
    })
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
                      title={ex.name}
                      subtitle={subtitle}
                      badges={[getExercisePhaseLabel(phase)]}
                      selected={selectedExercise === ex.id}
                      onClick={() => setSelectedExercise(ex.id)}
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

          <div
            className={cn(
              'shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80',
              !selectedExercise && 'opacity-90'
            )}
          >
            {selectedExercise && (
              <div className="mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('dialogs.addToDay.sets')}</label>
                    <Input
                      type="number"
                      min="1"
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                      className="h-9"
                      required
                    />
                  </div>

                  {isHold ? (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        {t('dialogs.addToDay.repsOptional')}
                      </label>
                      <Input
                        placeholder="e.g., 5"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t('dialogs.addToDay.reps')}</label>
                      <Input
                        placeholder="e.g., 10 or 8-12"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                  )}
                </div>

                {isHold && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        {getDurationLabel(durationUnit)} *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        {t('dialogs.addToDay.durationUnit')}
                      </label>
                      <select
                        value={durationUnit}
                        onChange={(e) => setDurationUnit(e.target.value)}
                        className={selectClassName}
                      >
                        <option value="seconds">{t('durationUnits.seconds')}</option>
                        <option value="minutes">{t('durationUnits.minutes')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9">
                <X className="h-4 w-4 mr-1.5" />
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="flex-1 h-9" disabled={!selectedExercise}>
                <Save className="h-4 w-4 mr-1.5" />
                {t('exercises.addExercise')}
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
