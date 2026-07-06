import { useState } from 'react'
import { Play, ChevronDown, ChevronUp, Dumbbell, X, Check, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PRESET_TEMPLATES, getRecommendedWorkoutTemplateId, getRelevantWorkoutTemplates } from '@/lib/presetTemplates'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { translateWeekday } from '@/lib/i18nHelpers'
import { resolveEffectiveTrainingGoal } from '@/lib/profileUtils'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Dialog to map each split day to an actual weekday */
function PresetLoadDialog({ preset, workoutDays, onClose, onConfirm }) {
  const days = workoutDays.length > 0 ? workoutDays : DAYS_OF_WEEK
  const splitKeys = Object.keys(preset.scheduleMap)

  const [mapping, setMapping] = useState(() => {
    const m = {}
    splitKeys.forEach((key, i) => {
      m[key] = days[i % days.length]
    })
    return m
  })

  const handleConfirm = () => {
    onConfirm(mapping, 'replace')
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply "{preset.name}"</DialogTitle>
          <DialogDescription>
            Map each split day to a day of your week. This will replace the exercises on the selected days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Replace warning */}
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span>⚠️ This will <strong>replace</strong> your entire exercise library and workout schedule. This cannot be undone.</span>
          </div>

          {/* Day mapping */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Day mapping</p>
            {splitKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs font-medium w-24 shrink-0 capitalize text-muted-foreground">
                  {preset.scheduleMap[key].length} exercises
                </span>
                <Badge variant="outline" className="text-xs shrink-0 w-20 justify-center">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <select
                  value={mapping[key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>{translateWeekday(d)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-1.5" />
              Replace & Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Single preset card */
function PresetCard({ preset, workoutDays, onApply, recommended = false }) {
  const [expanded, setExpanded] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)

  const splitKeys = Object.keys(preset.scheduleMap)

  return (
    <>
      <Card className={cn('overflow-hidden transition-all', recommended && 'border-primary/50 bg-primary/5')}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm">{preset.name}</CardTitle>
                {recommended && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                    <Star className="h-2.5 w-2.5" />
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
                className="h-7 text-xs px-2.5"
                onClick={() => setLoadOpen(true)}
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
            {splitKeys.map((key) => (
              <div key={key}>
                <p className="text-xs font-semibold capitalize text-muted-foreground mb-1.5">
                  {key.replace(/([A-Z])/g, ' $1').trim()} Day
                </p>
                <div className="flex flex-wrap gap-1">
                  {preset.scheduleMap[key].map((name) => (
                    <Badge key={name} variant="outline" className="text-[10px]">
                      <Dumbbell className="h-2.5 w-2.5 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {loadOpen && (
        <PresetLoadDialog
          preset={preset}
          workoutDays={workoutDays}
          onClose={() => setLoadOpen(false)}
          onConfirm={(mapping, mode) => {
            onApply(preset, mapping, mode)
            setLoadOpen(false)
          }}
        />
      )}
    </>
  )
}

const GOAL_GROUPS = [
  { goal: 'fat', label: '🔥 Weight Loss', description: 'High-rep circuits and cardio-strength combos to maximise calorie burn.' },
  { goal: 'muscle', label: '💪 Muscle Gain', description: 'Volume-focused splits designed to build size and strength.' },
  { goal: 'strength', label: '🏋️ Strength', description: 'Compound-heavy programs for building raw power.' },
  { goal: null, label: '⚡ General Fitness', description: 'Balanced programs suitable for all goals.' },
]

/** Section rendered at the top of the Templates tab */
function PresetTemplatesSection({ state, updateState, onAfterApply }) {
  const workoutDays = state.profile?.workoutDays || []
  const recommendedId = getRecommendedWorkoutTemplateId(state.profile || {})
  const relevantTemplates = getRelevantWorkoutTemplates(state.profile || {})

  const handleApply = (preset, mapping, _mode) => {
    // Always replace — clear the entire schedule and library first
    const mode = 'replace'
    const splitKeys = Object.keys(preset.scheduleMap)
    const schedule = {}

    splitKeys.forEach((key) => {
      const targetDay = mapping[key]
      if (!targetDay) return
      const exercises = preset.scheduleMap[key].map((name) => ({ name }))
      if (!schedule[targetDay]) {
        schedule[targetDay] = { note: `${preset.name} — ${key.replace(/([A-Z])/g, ' $1').trim()}`, exercises }
      } else {
        schedule[targetDay].exercises.push(...exercises)
      }
    })

    const payload = { ...preset.payload, schedule }

    try {
      // REPLACE_LIBRARY wipes the library and schedule, then rebuilds from payload.
      // Also override workoutDays to only the preset's mapped days (no old days carried over).
      const presetDays = Object.values(mapping).filter(Boolean)
      const result = applyExerciseImport(state, payload, IMPORT_MODE.REPLACE_LIBRARY)
      updateState({
        customExercises: result.customExercises,
        workoutSchedule: result.workoutSchedule,
        profile: {
          ...result.profile,
          workoutDays: presetDays,
        },
      })
      const { exercisesAdded, scheduleEntriesAdded } = result.summary
      toast.success(
        `Applied "${preset.name}" — ${exercisesAdded} exercises added to library, ${scheduleEntriesAdded} scheduled.`
      )
      onAfterApply?.()
    } catch (err) {
      toast.error(err.message || 'Failed to apply template.')
    }
  }

  // Group templates: recommended first in its group, then by goal
  const [showAll, setShowAll] = useState(false)

  const recommended = relevantTemplates.find((p) => p.id === recommendedId) ?? relevantTemplates[0]
  const others = relevantTemplates.filter((p) => p.id !== recommended?.id)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Recommended for your goal. Applying will <span className="font-semibold text-foreground">replace</span> your current exercise library and schedule.
      </p>

      <PresetCard
        preset={recommended}
        workoutDays={workoutDays}
        onApply={handleApply}
        recommended
      />

      {!showAll ? (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setShowAll(true)}
        >
          See all plans ({others.length} more)
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Other plans</p>
          {others.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              workoutDays={workoutDays}
              onApply={handleApply}
              recommended={false}
            />
          ))}
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => setShowAll(false)}
          >
            Show less
          </button>
        </div>
      )}
    </div>
  )
}

export default PresetTemplatesSection
