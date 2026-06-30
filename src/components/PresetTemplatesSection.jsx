import { useState } from 'react'
import { Play, ChevronDown, ChevronUp, Dumbbell, X, Check, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PRESET_TEMPLATES, getRecommendedWorkoutTemplateId } from '@/lib/presetTemplates'
import { applyExerciseImport, IMPORT_MODE } from '@/lib/exerciseImport'
import { translateWeekday } from '@/lib/i18nHelpers'
import { resolveEffectiveTrainingGoal } from '@/lib/profileUtils'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Dialog to map each split day to an actual weekday */
function PresetLoadDialog({ preset, workoutDays, onClose, onConfirm }) {
  const days = workoutDays.length > 0 ? workoutDays : DAYS_OF_WEEK
  const splitKeys = Object.keys(preset.scheduleMap)

  const [mapping, setMapping] = useState(() => {
    // default: spread split days across available days
    const m = {}
    splitKeys.forEach((key, i) => {
      m[key] = days[i % days.length]
    })
    return m
  })
  const [mode, setMode] = useState('append')

  const handleConfirm = () => {
    onConfirm(mapping, mode)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply "{preset.name}"</DialogTitle>
          <DialogDescription>
            Map each split day to a day of your week, then choose how to apply it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
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

          {/* Mode */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Apply mode</p>
            <div className="grid grid-cols-2 gap-2">
              {['append', 'replace'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-medium transition-colors text-center capitalize',
                    mode === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'append'
                ? 'Adds exercises without removing existing ones.'
                : 'Replaces the exercises on the mapped days.'}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-1.5" />
              Apply
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
function PresetTemplatesSection({ state, updateState }) {
  const workoutDays = state.profile?.workoutDays || []
  const recommendedId = getRecommendedWorkoutTemplateId(state.profile || {})

  const handleApply = (preset, mapping, mode) => {
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
    const importMode = mode === 'replace' ? IMPORT_MODE.REPLACE_SCHEDULE : IMPORT_MODE.APPEND

    try {
      const result = applyExerciseImport(state, payload, importMode)
      updateState({
        customExercises: result.customExercises,
        workoutSchedule: result.workoutSchedule,
        profile: result.profile,
      })
      const { exercisesAdded, scheduleEntriesAdded } = result.summary
      toast.success(
        `Applied "${preset.name}" — ${exercisesAdded} exercises added to library, ${scheduleEntriesAdded} scheduled.`
      )
    } catch (err) {
      toast.error(err.message || 'Failed to apply template.')
    }
  }

  // Group templates: recommended first in its group, then by goal
  const userGoal = resolveEffectiveTrainingGoal(state.profile || {})

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold mb-0.5">Preset Plans</p>
        <p className="text-xs text-muted-foreground">
          Ready-made programs with well-known exercises. Map each day to your schedule and apply instantly.
        </p>
      </div>

      {GOAL_GROUPS.map(({ goal, label, description }) => {
        const templates = PRESET_TEMPLATES.filter((p) =>
          goal === null ? !p.goal || p.goal === 'strength' : p.goal === goal
        )
        if (templates.length === 0) return null

        const isUserGoalGroup =
          goal === userGoal ||
          (goal === null && (userGoal === 'strength' || !userGoal))

        // Sort: recommended first
        const sorted = [...templates].sort((a, b) => {
          if (a.id === recommendedId) return -1
          if (b.id === recommendedId) return 1
          return 0
        })

        return (
          <div key={goal ?? 'general'} className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{label}</p>
              {isUserGoalGroup && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  Your goal
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">{description}</p>
            <div className="space-y-3">
              {sorted.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  workoutDays={workoutDays}
                  onApply={handleApply}
                  recommended={preset.id === recommendedId}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PresetTemplatesSection
