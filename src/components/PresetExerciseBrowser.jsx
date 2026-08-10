import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExerciseImageMap } from '@/lib/usePresets'
import { Plus, Library, Search, Info } from 'lucide-react'
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
} from '@/lib/presetExercises'
import { normalizeMuscleGroup } from '@/lib/exerciseTaxonomy'
import { displayDifficulty, displayEquipment, displayLocation, displayMuscleList } from '@/lib/exerciseFilterDisplay'
import ExerciseDetailSheet from './ExerciseDetailSheet'

export default function PresetExerciseBrowser({
  open,
  onOpenChange,
  customExercises,
  onAdd,
  profileEquipment = [],
}) {
  const { t } = useTranslation()
  const exerciseImageMap = useExerciseImageMap()
  const presets = useMemo(() => getPresetExercises(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [detailExercise, setDetailExercise] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('Strength')
  const [muscleFilter, setMuscleFilter] = useState('')
  // Auto-set from profile on first open — 'Gym' means no filter (full gym = all equipment)
  const defaultEquipmentFilter = useMemo(() => {
    if (!profileEquipment.length) return ''
    if (profileEquipment.includes('Gym')) return ''
    return profileEquipment[0] || ''
  }, [profileEquipment])
  const [equipmentFilter, setEquipmentFilter] = useState(defaultEquipmentFilter)
  const [autoFiltered, setAutoFiltered] = useState(!!defaultEquipmentFilter)
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

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
    [
      presets,
      searchQuery,
      categoryFilter,
      muscleFilter,
      equipmentFilter,
      difficultyFilter,
      locationFilter,
    ]
  )

  const availableCount = filteredPresets.filter(
    (preset) => !isPresetInLibrary(preset.name, customExercises)
  ).length

  const handleAddOne = (preset) => {
    if (isPresetInLibrary(preset.name, customExercises)) return
    const { customExercises: next, added } = addPresetsToLibrary(customExercises, [preset])
    if (added.length) onAdd(next, added)
  }

  const handleAddAllVisible = () => {
    const toAdd = filteredPresets.filter(
      (preset) => !isPresetInLibrary(preset.name, customExercises)
    )
    if (!toAdd.length) return
    const { customExercises: next, added } = addPresetsToLibrary(customExercises, toAdd)
    onAdd(next, added)
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
                      disabled={inLibrary}
                      imageUrl={exerciseImageMap[preset.id] ?? null}
                      onClick={() => handleAddOne(preset)}
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
                        </div>
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>

          {availableCount > 0 && (
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
