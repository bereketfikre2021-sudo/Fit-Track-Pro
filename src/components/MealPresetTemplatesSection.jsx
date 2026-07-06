import { useState } from 'react'
import { ChevronDown, ChevronUp, Flame, TrendingUp, Sparkles, Check, X, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  PRESET_MEAL_PLANS,
  buildPresetMealPlanDays,
  getRecommendedMealPlanId,
  getRelevantMealPlans,
} from '@/lib/presetMealPlans'
import { buildPresetShoppingList } from '@/lib/presetShoppingLists'
import { calculateBmi, getBmiCategory } from '@/lib/profileUtils'
import { getDayMacroTotals, formatMacroSummary } from '@/lib/mealPlan'
import { translateWeekday } from '@/lib/i18nHelpers'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const MEAL_SLOT_LABELS = {
  breakfast: '🌅 Breakfast',
  morningSnack: '🥜 Morning Snack',
  lunch: '🍛 Lunch',
  afternoonSnack: '☕️ Afternoon Snack',
  dinner: '🍽 Dinner',
  beforeBed: '🌙 Before Bed',
}

/** Confirm dialog before overwriting an existing meal plan */
function ApplyConfirmDialog({ preset, onClose, onConfirm }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply "{preset.name}"</DialogTitle>
          <DialogDescription>
            This will <strong>replace</strong> your current meal plan and shopping list completely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span>⚠️ Your existing meal plan and shopping list will be permanently replaced. This cannot be undone.</span>
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
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl leading-none">{preset.emoji}</span>
                <CardTitle className="text-sm">{preset.name}</CardTitle>
                {isRecommended && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary text-primary-foreground">
                    <Sparkles className="h-2.5 w-2.5" />
                    Recommended
                  </Badge>
                )}
                {preset.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardDescription className="text-xs mt-0.5 line-clamp-2">
                {preset.description}
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
                      {foods.map((food) => (
                        <Badge key={food.name} variant="outline" className="text-[10px]">
                          {food.name.split(' (')[0]}
                          {food.calories > 0 && (
                            <span className="ml-1 text-muted-foreground">{food.calories} kcal</span>
                          )}
                        </Badge>
                      ))}
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
  const profile = state.profile || {}
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  const bmiCategory = getBmiCategory(bmi)
  const recommendedId = getRecommendedMealPlanId(bmiCategory, profile.goal)

  const handleApply = (preset, mode) => {
    const freshDays = buildPresetMealPlanDays(preset)
    // Apply the matching shopping list automatically (same id — weight-gain or weight-loss)
    const shoppingList = buildPresetShoppingList(preset.id)

    if (mode === 'replace') {
      updateState({ mealPlan: freshDays, ...(shoppingList ? { shoppingList } : {}) })
    } else {
      const existing = state.mealPlan || {}
      const merged = { ...existing }
      for (const day of DAYS_OF_WEEK) {
        merged[day] = merged[day] || {}
        for (const slot of Object.keys(MEAL_SLOT_LABELS)) {
          merged[day][slot] = [
            ...(merged[day][slot] || []),
            ...(freshDays[day]?.[slot] || []),
          ]
        }
      }
      updateState({ mealPlan: merged, ...(shoppingList ? { shoppingList } : {}) })
    }

    toast.success(
      shoppingList
        ? `Applied "${preset.name}" — meal plan and shopping list updated.`
        : `Applied "${preset.name}" to your meal plan.`
    )
    onAfterApply?.()
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Recommended for your goal and BMI. Applying will <span className="font-semibold text-foreground">replace</span> your current meal plan and automatically update the matching shopping list.
      </p>

      {(() => {
        const relevantPlans = getRelevantMealPlans(bmiCategory, profile.goal)
        const recommended = relevantPlans.find((p) => p.id === recommendedId) ?? relevantPlans[0]
        const others = relevantPlans.filter((p) => p.id !== recommended?.id)
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
