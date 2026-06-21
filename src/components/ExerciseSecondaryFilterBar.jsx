import { useTranslation } from 'react-i18next'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from './ui/button'
import {
  DIFFICULTY_LEVELS,
  EXERCISE_LOCATIONS,
  PRESET_FILTER_EQUIPMENT,
} from '@/lib/exerciseTaxonomy'
import { displayDifficulty, displayEquipment, displayLocation } from '@/lib/exerciseFilterDisplay'

const selectClass =
  'h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function ExerciseSecondaryFilterBar({
  equipmentFilter,
  onEquipmentChange,
  difficultyFilter,
  onDifficultyChange,
  locationFilter,
  onLocationChange,
  onClear,
  hasActiveFilters = false,
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground"
        aria-hidden="true"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </div>

      <select
        value={equipmentFilter}
        onChange={(e) => onEquipmentChange(e.target.value)}
        className={selectClass}
        aria-label={t('exercises.filterEquipment')}
      >
        <option value="">{t('exercises.allEquipment')}</option>
        {PRESET_FILTER_EQUIPMENT.map((equipment) => (
          <option key={equipment} value={equipment}>
            {displayEquipment(equipment, t)}
          </option>
        ))}
      </select>

      <select
        value={difficultyFilter}
        onChange={(e) => onDifficultyChange(e.target.value)}
        className={selectClass}
        aria-label={t('exercises.filterDifficulty')}
      >
        <option value="">{t('exercises.allDifficulties')}</option>
        {DIFFICULTY_LEVELS.map((level) => (
          <option key={level} value={level}>
            {displayDifficulty(level, t)}
          </option>
        ))}
      </select>

      <select
        value={locationFilter}
        onChange={(e) => onLocationChange(e.target.value)}
        className={selectClass}
        aria-label={t('exercises.filterLocation')}
      >
        <option value="">{t('exercises.allLocations')}</option>
        {EXERCISE_LOCATIONS.map((location) => (
          <option key={location} value={location}>
            {displayLocation(location, t)}
          </option>
        ))}
      </select>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 px-2 text-xs text-muted-foreground"
          onClick={onClear}
        >
          {t('exercises.clearFilters')}
        </Button>
      )}
    </div>
  )
}
