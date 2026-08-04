import { useTranslation } from 'react-i18next'
import { Dumbbell, Activity, Leaf } from 'lucide-react'
import { Button } from './ui/button'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { cn } from '@/lib/utils'
import { CATEGORY_MUSCLE_CHIPS, EXERCISE_CATEGORIES } from '@/lib/exerciseTaxonomy'
import { displayCategory, displayMuscle } from '@/lib/exerciseFilterDisplay'

const CATEGORY_TAB_ICONS = {
  Strength: Dumbbell,
  Cardio:   Activity,
  Mobility: Leaf,
}

export default function ExerciseFilterBar({
  categoryFilter,
  onCategoryChange,
  muscleFilter,
  onMuscleChange,
}) {
  const { t } = useTranslation()
  const muscleChips = CATEGORY_MUSCLE_CHIPS[categoryFilter] || []

  const handleCategoryChange = (value) => {
    onCategoryChange(value)
    onMuscleChange('')
  }

  return (
    <div className="space-y-3">
      <Tabs value={categoryFilter} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/50 p-1">
          {EXERCISE_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_TAB_ICONS[cat]
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                {displayCategory(cat, t)}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={!muscleFilter ? 'default' : 'outline'}
          className="h-8"
          onClick={() => onMuscleChange('')}
        >
          {t('exercises.allMuscles')}
        </Button>
        {muscleChips.map((muscle) => (
          <Button
            key={muscle}
            type="button"
            size="sm"
            variant={muscleFilter === muscle ? 'default' : 'outline'}
            className={cn('h-8', muscleFilter === muscle && 'ring-1 ring-primary/30')}
            onClick={() => onMuscleChange(muscleFilter === muscle ? '' : muscle)}
          >
            {displayMuscle(muscle, t)}
          </Button>
        ))}
      </div>
    </div>
  )
}
