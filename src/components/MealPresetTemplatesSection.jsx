import { useState } from 'react'
import { ChevronDown, ChevronUp, Flame, TrendingUp, Sparkles, Check, X, Play, Sunrise, Apple, Utensils, Coffee, UtensilsCrossed, Moon, AlertTriangle, Camera } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  buildPresetMealPlanDays,
  getRecommendedMealPlanId,
  getRelevantMealPlans,
  localizedPreset,
} from '@/lib/presetMealPlans'
import { buildPresetShoppingList } from '@/lib/presetShoppingLists'
import { useMergedMealPlans, buildMergedMealPlanDays, buildMergedShoppingList } from '@/lib/usePresets'
import { calculateBmi, getBmiCategory } from '@/lib/profileUtils'
import { getDayMacroTotals, formatMacroSummary } from '@/lib/mealPlan'
import { translateWeekday } from '@/lib/i18nHelpers'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_SLOT_ICONS = {
  breakfast:      Sunrise,
  morningSnack:   Apple,
  lunch:          Utensils,
  afternoonSnack: Coffee,
  dinner:         UtensilsCrossed,
  beforeBed:      Moon,
}

const MEAL_SLOT_LABELS = {
  breakfast:      'Breakfast',
  morningSnack:   'Morning Snack',
  lunch:          'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner:         'Dinner',
  beforeBed:      'Before Bed',
}

/** Confirm dialog before overwriting an existing meal plan */
function ApplyConfirmDialog({ preset, onClose, onConfirm }) {
  const { i18n } = useTranslation()
  const lp = localizedPreset(preset, i18n.language)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply "{lp.name}"</DialogTitle>
          <DialogDescription>
            This will <strong>replace</strong> your current meal plan and shopping list completely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
            <span>Your existing meal plan and shopping list will be permanently replaced. This cannot be undone.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => onConfirm('replace')}>
              <Check className="h-4 w-4 mr-1.5" />
              Replace & Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Single preset meal plan card */
function MealPresetCard({ preset, isRecommended, onApply }) {
  const { i18n } = useTranslation()
  const lp = localizedPreset(preset, i18n.language)
  const [expanded, setExpanded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [previewDay, setPreviewDay] = useState('Monday')

  // Compute macro totals for the preview day
  const previewMacros = getDayMacroTotals({ [previewDay]: preset.days[previewDay] }, previewDay)
  const macroLabel = formatMacroSummary(previewMacros)

  const isGain = preset.id === 'weight-gain'

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200',
          isRecommended
            ? 'ring-2 ring-primary border-primary shadow-md shadow-primary/10'
            : 'border-border'
        )}
      >
        <CardHeader className="pb-2 pt-3 px-4">
          {/* Admin-uploaded thumbnail — shown as full-width strip when present */}
          {preset.image_url && (
            <div className="w-full h-24 overflow-hidden rounded-lg mb-3 -mx-0">
              <img src={preset.image_url} alt={lp.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl leading-none">{preset.emoji}</span>
                <CardTitle className="text-sm">{lp.name}</CardTitle>
                {isRecommended && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary text-primary-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommended
                  </Badge>
                )}
                {lp.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardDescription className="text-xs mt-0.5 line-clamp-2">
                {lp.description}
              </CardDescription>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                className={cn(
                  'h-7 text-xs px-2.5',
                  isRecommended && 'ring-1 ring-primary/40'
                )}
                onClick={() => setConfirmOpen(true)}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Use
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 pb-4 px-4 border-t border-border/60 mt-1 space-y-3">
            {/* Day selector */}
            <div className="flex flex-wrap gap-1 mt-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setPreviewDay(day)}
                  className={cn(
                    'rounded px-2 py-0.5 text-[11px] font-medium border transition-colors',
                    previewDay === day
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {translateWeekday(day).slice(0, 3)}
                </button>
              ))}
            </div>

            {macroLabel && (
              <p className="text-xs text-muted-foreground">
                {translateWeekday(previewDay)}: {macroLabel}
              </p>
            )}

            {/* Meal slots for selected day */}
            <div className="space-y-2">
              {Object.entries(MEAL_SLOT_LABELS).map(([slotId, label]) => {
                const foods = preset.days[previewDay]?.[slotId] || []
                if (foods.length === 0) return null
                return (
                  <div key={slotId}>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</p>
                    <div className="flex flex-wrap gap-1">
                      {foods.map((food) => {
                        const displayName = i18n.language === 'am'
                          ? (food.name_am || food.name_en || food.name)
                          : (food.name_en || food.name)
                        return (
                        <Badge key={food.name} variant="outline" className="text-[10px]">
                          {displayName.split(' (')[0]}
                          {food.calories > 0 && (
                            <span className="ml-1 text-muted-foreground">{food.calories} kcal</span>
                          )}
                        </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {confirmOpen && (
        <ApplyConfirmDialog
          preset={preset}
          onClose={() => setConfirmOpen(false)}
          onConfirm={(mode) => {
            onApply(preset, mode)
            setConfirmOpen(false)
          }}
        />
      )}
    </>
  )
}

/**
 * Section rendered at the top of the Meals tab showing preset meal plan templates.
 * Detects the user's BMI / goal and visually highlights the recommended plan.
 */
function MealPresetTemplatesSection({ state, updateState, onAfterApply }) {
  const { i18n } = useTranslation()
  const mergedPresets = useMergedMealPlans()
  const profile = state.profile || {}
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  const bmiCategory = getBmiCategory(bmi)
  const recommendedId = getRecommendedMealPlanId(bmiCategory, profile.goal)

  // Use merged presets filtered by relevance
  const relevantIds = getRelevantMealPlans(bmiCategory, profile.goal).map(p => p.id)
  const relevant = mergedPresets.filter(p => relevantIds.includes(p.id))

  const handleApply = (preset, mode) => {
    const freshDays = buildMergedMealPlanDays(preset)
    const shoppingList = buildMergedShoppingList(preset)
    if (mode === 'replace') {
      updateState({ mealPlan: freshDays, ...(shoppingList ? { shoppingList } : {}) })
    } else {
      const existing = state.mealPlan || {}
      const merged = { ...existing }
      for (const day of DAYS_OF_WEEK) {
        merged[day] = merged[day] || {}
        for (const slot of Object.keys(MEAL_SLOT_LABELS)) {
          merged[day][slot] = [...(merged[day][slot] || []), ...(freshDays[day]?.[slot] || [])]
        }
      }
      updateState({ mealPlan: merged, ...(shoppingList ? { shoppingList } : {}) })
    }
    toast.success(
      shoppingList
        ? `Applied "${localizedPreset(preset, i18n.language).name}" — meal plan and shopping list updated.`
        : `Applied "${localizedPreset(preset, i18n.language).name}" to your meal plan.`
    )
    onAfterApply?.()
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Recommended for your goal and BMI. Applying will <span className="font-semibold text-foreground">replace</span> your current meal plan and automatically update the matching shopping list.
      </p>

      {(() => {
        const recommended = relevant.find((p) => p.id === recommendedId) ?? relevant[0]
        const others = relevant.filter((p) => p.id !== recommended?.id)
        return (
          <>
            <MealPresetCard
              preset={recommended}
              isRecommended
              onApply={handleApply}
            />
            {others.length > 0 && (
              <details className="group">
                <summary className="text-xs text-primary hover:underline cursor-pointer list-none">
                  See other options ({others.length} more)
                </summary>
                <div className="space-y-3 mt-3">
                  {others.map((preset) => (
                    <MealPresetCard
                      key={preset.id}
                      preset={preset}
                      isRecommended={false}
                      onApply={handleApply}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )
      })()}
    </div>
  )
}

export default MealPresetTemplatesSection
