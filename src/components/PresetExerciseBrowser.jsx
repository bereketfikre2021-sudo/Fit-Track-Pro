import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseImageMap } from '@/lib/usePresets'
import { Plus, Library, Search, Info, Calendar, ChevronDown, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import ExerciseFilterBar from './ExerciseFilterBar'
import ExerciseSecondaryFilterBar from './ExerciseSecondaryFilterBar'
import ExercisePickerRow from './ExercisePickerRow'
import { FULLSCREEN_DIALOG_CONTENT_CLASS } from './dialogStyles'
import {
  addPresetsToLibrary,
  filterPresetExercises,
  getPresetExercises,
  isPresetInLibrary,
  presetToLibraryExercise,
} from '@/lib/presetExercises'
import { normalizeMuscleGroup } from '@/lib/exerciseTaxonomy'
import { displayDifficulty, displayEquipment, displayLocation, displayMuscleList } from '@/lib/exerciseFilterDisplay'
import ExerciseDetailSheet from './ExerciseDetailSheet'
import { addExerciseToDay } from '@/lib/workoutSchedule'
import { translateWeekday } from '@/lib/i18nHelpers'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function PresetExerciseBrowser({
  open,
  onOpenChange,
  customExercises,
  onAdd,
  profileEquipment = [],
  // Optional: pass workoutDays + workoutSchedule + onAddToDay to enable "Add to Day" mode
  workoutDays = [],
  workoutSchedule = {},
  onAddToDay = null,
}) {
  const { t } = useTranslation()
  const exerciseImageMap = useExerciseImageMap()
  const presets = useMemo(() => getPresetExercises(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [detailExercise, setDetailExercise] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('Strength')
  const [muscleFilter, setMuscleFilter] = useState('')
  const defaultEquipmentFilter = useMemo(() => {
    if (!profileEquipment.length) return ''
    if (profileEquipment.includes('Gym')) return ''
    return profileEquipment[0] || ''
  }, [profileEquipment])
  const [equipmentFilter, setEquipmentFilter] = useState(defaultEquipmentFilter)
  const [autoFiltered, setAutoFiltered] = useState(!!defaultEquipmentFilter)
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // "Add to Day" mode
  const hasAddToDay = onAddToDay !== null && workoutDays.length > 0
  const [mode, setMode] = useState('library') // 'library' | 'day'
  const [selectedDay, setSelectedDay] = useState(() => workoutDays[0] || null)
  const [dayPickerOpen, setDayPickerOpen] = useState(false)

  const hasSecondaryFilters = Boolean(equipmentFilter || difficultyFilter || locationFilter)

  const filteredPresets = useMemo(
    () =>
      filterPresetExercises(presets, {
        searchQuery,
        categoryFilter,
        muscleFilter,
        equipmentFilter,
        difficultyFilter,
        locationFilter,
        sortBy: 'name',
      }),
    [presets, searchQuery, categoryFilter, muscleFilter, equipmentFilter, difficultyFilter, locationFilter]
  )

  const availableCount = filteredPresets.filter(
    (preset) => !isPresetInLibrary(preset.name, customExercises)
  ).length

  /** Add preset to library only */
  const handleAddOne = (preset) => {
    if (isPresetInLibrary(preset.name, customExercises)) return
    const { customExercises: next, added } = addPresetsToLibrary(customExercises, [preset])
    if (added.length) onAdd(next, added)
  }

  const handleAddAllVisible = () => {
    const toAdd = filteredPresets.filter((preset) => !isPresetInLibrary(preset.name, customExercises))
    if (!toAdd.length) return
    const { customExercises: next, added } = addPresetsToLibrary(customExercises, toAdd)
    onAdd(next, added)
  }

  /** Add preset to a specific workout day.
   *  - If the preset is not yet in the library, add it first.
   *  - Then schedule it to the selected day.
   */
  const handleAddToDay = (preset, day) => {
    if (!day || !onAddToDay) return

    // Ensure the exercise is in the library first
    let exercises = customExercises
    let libraryExercise = exercises.find(
      (ex) => ex.name?.toLowerCase().trim() === preset.name?.toLowerCase().trim()
    )

    if (!libraryExercise) {
      const { customExercises: next, added } = addPresetsToLibrary(exercises, [preset])
      exercises = next
      libraryExercise = added[0]
      // Notify parent about the new library item
      onAdd(exercises, added)
    }

    if (!libraryExercise) return

    // Build schedule entry details from preset defaults
    const details = {
      sets: preset.sets || '3',
      reps: preset.reps || '10',
      duration: preset.duration || '30',
      durationUnit: preset.durationUnit || 'seconds',
      isTimeBased: Boolean(preset.isTimeBased),
      weightKg: '',
    }

    onAddToDay(day, libraryExercise.id, details, exercises)
    toast.success(`${preset.name} added to ${translateWeekday(day)}`)
  }

  const clearSecondaryFilters = () => {
    setEquipmentFilter('')
    setDifficultyFilter('')
    setLocationFilter('')
  }

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setSearchQuery('')
      setMuscleFilter('')
      clearSecondaryFilters()
      setEquipmentFilter(defaultEquipmentFilter)
      setAutoFiltered(!!defaultEquipmentFilter)
      setDayPickerOpen(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={FULLSCREEN_DIALOG_CONTENT_CLASS}>
        <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Library className="h-4 w-4" />
            {t('exercises.presetTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">{t('exercises.presetDesc')}</DialogDescription>
        </DialogHeader>

        {/* Mode switcher — only shown when workoutDays are available */}
        {hasAddToDay && (
          <div className="shrink-0 flex gap-1 px-4 pt-3">
            <button
              type="button"
              onClick={() => setMode('library')}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors',
                mode === 'library'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              <Library className="inline h-3 w-3 mr-1" />
              Add to Library
            </button>
            <button
              type="button"
              onClick={() => setMode('day')}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors',
                mode === 'day'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              <Calendar className="inline h-3 w-3 mr-1" />
              Add to Day
            </button>
          </div>
        )}

        {/* Day selector — shown in "Add to Day" mode */}
        {hasAddToDay && mode === 'day' && (
          <div className="shrink-0 px-4 pt-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDayPickerOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                  {selectedDay ? translateWeekday(selectedDay) : 'Select a day'}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', dayPickerOpen && 'rotate-180')} />
              </button>
              {dayPickerOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-background shadow-lg overflow-hidden">
                  {workoutDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => { setSelectedDay(day); setDayPickerOpen(false) }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                        selectedDay === day
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted/60'
                      )}
                    >
                      <span>{translateWeekday(day)}</span>
                      {selectedDay === day && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedDay && (
              <p className="text-[10px] text-muted-foreground mt-1 px-0.5">
                Exercises will be added to your {translateWeekday(selectedDay)} workout. They're also saved to your library.
              </p>
            )}
          </div>
        )}

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

          <ExerciseFilterBar
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            muscleFilter={muscleFilter}
            onMuscleChange={setMuscleFilter}
          />

          <ExerciseSecondaryFilterBar
            equipmentFilter={equipmentFilter}
            onEquipmentChange={setEquipmentFilter}
            difficultyFilter={difficultyFilter}
            onDifficultyChange={setDifficultyFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            hasActiveFilters={hasSecondaryFilters}
            onClear={clearSecondaryFilters}
          />

          <p className="text-[10px] text-muted-foreground">
            {t('exercises.shownSorted', { count: filteredPresets.length })}
          </p>

          {autoFiltered && equipmentFilter && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-primary/8 border border-primary/20 px-2.5 py-1.5">
              <p className="text-[11px] text-primary">
                Showing <span className="font-semibold">{equipmentFilter}</span> exercises from your profile equipment
              </p>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground underline shrink-0"
                onClick={() => { setEquipmentFilter(''); setAutoFiltered(false) }}
              >
                Show all
              </button>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
            {filteredPresets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {t('exercises.noMatch')}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredPresets.map((preset) => {
                  const inLibrary = isPresetInLibrary(preset.name, customExercises)
                  const subtitle = [
                    displayMuscleList(normalizeMuscleGroup(preset), t),
                    displayEquipment(preset.equipment, t),
                    displayDifficulty(preset.difficulty, t),
                    preset.location ? displayLocation(preset.location, t) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')

                  return (
                    <ExercisePickerRow
                      key={preset.id}
                      title={preset.name}
                      subtitle={subtitle}
                      disabled={mode === 'library' && inLibrary}
                      imageUrl={exerciseImageMap[preset.id] ?? exerciseImageMap[`name:${String(preset.name).toLowerCase().replace(/\s+/g, '-')}`] ?? null}
                      onClick={() => {
                        if (mode === 'day') {
                          handleAddToDay(preset, selectedDay)
                        } else {
                          handleAddOne(preset)
                        }
                      }}
                      trailing={
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailExercise(preset) }}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary transition-colors shrink-0"
                            title="Preview exercise"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          {mode === 'day' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              disabled={!selectedDay}
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddToDay(preset, selectedDay)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-0.5" />
                              {selectedDay ? translateWeekday(selectedDay) : 'Pick day'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant={inLibrary ? 'outline' : 'default'}
                              disabled={inLibrary}
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddOne(preset)
                              }}
                            >
                              {inLibrary ? (
                                t('exercises.presetInLibrary')
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-0.5" />
                                  {t('exercises.presetAdd')}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>

          {mode === 'library' && availableCount > 0 && (
            <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <Button className="w-full h-9" variant="outline" onClick={handleAddAllVisible}>
                <Plus className="h-4 w-4 mr-2" />
                {t('exercises.presetAddAll', { count: availableCount })}
              </Button>
            </div>
          )}
        </div>
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
