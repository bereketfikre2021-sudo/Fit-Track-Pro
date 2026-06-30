import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Play,
  LayoutTemplate,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  addExerciseToTemplate,
  removeExerciseFromTemplate,
  reorderTemplateExercises,
  loadTemplateIntoDay,
} from '@/lib/workoutSchedule'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import AddExerciseToDayDialog from './AddExerciseToDayDialog'
import ScheduleExerciseList from './ScheduleExerciseList'
import { translateWeekday } from '@/lib/i18nHelpers'
import PresetTemplatesSection from './PresetTemplatesSection'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Dialog to pick a target day and load mode when applying a template. */
function LoadTemplateDialog({ template, workoutDays, onClose, onLoad }) {
  const { t } = useTranslation()
  const days = workoutDays.length > 0 ? workoutDays : DAYS_OF_WEEK
  const [day, setDay] = useState(days[0] || 'Monday')
  const [mode, setMode] = useState('append')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('templates.loadTitle', { name: template.name })}</DialogTitle>
          <DialogDescription>{t('templates.loadDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('templates.targetDay')}</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {days.map((d) => (
                <option key={d} value={d}>{translateWeekday(d)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('templates.loadMode')}</label>
            <div className="grid grid-cols-2 gap-2">
              {['append', 'replace'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors text-center',
                    mode === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {t(`templates.mode.${m}`)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(`templates.modeHint.${mode}`)}
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4 mr-1.5" />
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={() => onLoad(day, mode)}>
              <Play className="h-4 w-4 mr-1.5" />
              {t('templates.loadBtn')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Single template card — expandable with exercise list and actions. */
function TemplateCard({
  template,
  customExercises,
  workoutDays,
  onUpdate,
  onDelete,
  onLoad,
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(template.name)
  const [addingExercise, setAddingExercise] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  const exerciseCount = template.exercises?.length ?? 0

  const saveName = () => {
    if (!nameValue.trim()) return
    onUpdate({ ...template, name: nameValue.trim() })
    setEditingName(false)
  }

  const handleAddExercise = (exerciseId, details) => {
    const updated = addExerciseToTemplate(template, customExercises, exerciseId, details)
    if (!updated) return
    onUpdate(updated)
    setAddingExercise(false)
    toast.success(t('templates.toastExerciseAdded'))
  }

  const handleRemoveExercise = (entryId) => {
    onUpdate(removeExerciseFromTemplate(template, entryId))
  }

  const handleReorder = (from, to) => {
    onUpdate(reorderTemplateExercises(template, from, to))
  }

  const handleUpdateEntry = (updated) => {
    onUpdate({
      ...template,
      exercises: template.exercises.map((ex) =>
        ex.id === updated.id ? updated : ex
      ),
    })
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') { setNameValue(template.name); setEditingName(false) }
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={saveName}>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setNameValue(template.name); setEditingName(false) }}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm truncate">{template.name}</CardTitle>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setEditingName(true)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <CardDescription className="text-xs mt-0.5">
                {t('templates.exerciseCount', { count: exerciseCount })}
              </CardDescription>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setLoadingTemplate(true)}
                disabled={exerciseCount === 0}
                title={t('templates.loadToDay')}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                {t('templates.loadToDay')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => {
                  if (!confirm(i18n.t('templates.confirmDelete', { name: template.name }))) return
                  onDelete(template.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? t('common.close') : t('common.edit')}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t border-border/60 mt-1">
            {exerciseCount > 0 ? (
              <ScheduleExerciseList
                exercises={template.exercises}
                onReorder={handleReorder}
                onRemove={handleRemoveExercise}
                onUpdate={handleUpdateEntry}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4 rounded-lg border border-dashed">
                {t('templates.emptyExercises')}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddingExercise(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('templates.addExercise')}
            </Button>
          </CardContent>
        )}
      </Card>

      {addingExercise && (
        <AddExerciseToDayDialog
          day={template.name}
          customExercises={customExercises}
          onClose={() => setAddingExercise(false)}
          onAdd={handleAddExercise}
        />
      )}

      {loadingTemplate && (
        <LoadTemplateDialog
          template={template}
          workoutDays={workoutDays}
          onClose={() => setLoadingTemplate(false)}
          onLoad={(day, mode) => {
            onLoad(day, mode)
            setLoadingTemplate(false)
          }}
        />
      )}
    </>
  )
}

/** Top-level template manager rendered inside the Templates tab. */
function TemplateManager({ state, updateState, showPresetTemplates = true }) {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const templates = state.workoutTemplates || []
  const workoutDays = state.profile?.workoutDays || []
  const customExercises = state.customExercises || []

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) {
      toast.error(t('templates.nameRequired'))
      return
    }
    const newTemplate = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      exercises: [],
    }
    updateState({ workoutTemplates: [...templates, newTemplate] })
    toast.success(t('templates.toastCreated', { name }))
    setNewName('')
    setCreating(false)
  }

  const handleUpdate = (updated) => {
    updateState({
      workoutTemplates: templates.map((t) => (t.id === updated.id ? updated : t)),
    })
  }

  const handleDelete = (id) => {
    updateState({ workoutTemplates: templates.filter((t) => t.id !== id) })
    toast.success(t('templates.toastDeleted'))
  }

  const handleLoad = (template, day, mode) => {
    const newSchedule = loadTemplateIntoDay(
      state.workoutSchedule || {},
      day,
      template,
      mode
    )
    updateState({ workoutSchedule: newSchedule })
    toast.success(
      t('templates.toastLoaded', {
        name: template.name,
        day: translateWeekday(day),
      })
    )
  }

  return (
    <div className="space-y-4">
      {showPresetTemplates && (
        <PresetTemplatesSection state={state} updateState={updateState} />
      )}

      {showPresetTemplates && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">Your Templates</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {!showPresetTemplates && (
        <div className="flex items-center gap-3 py-1">
          <span className="text-xs text-muted-foreground font-medium">Your Templates</span>
        </div>
      )}

      {/* Create new template */}
      {creating ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-sm font-medium mb-2">{t('templates.newTemplate')}</p>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('templates.namePlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                autoFocus
                className="flex-1"
              />
              <Button type="button" onClick={handleCreate}>
                <Check className="h-4 w-4 mr-1.5" />
                {t('common.save')}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setCreating(false); setNewName('') }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          className="w-full"
          onClick={() => setCreating(true)}
          disabled={customExercises.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('templates.createNew')}
        </Button>
      )}

      {customExercises.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 px-4">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1 text-center">{t('templates.noLibrary')}</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {t('templates.noLibraryDesc')}
            </p>
          </CardContent>
        </Card>
      )}

      {customExercises.length > 0 && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 px-4">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-medium mb-1 text-center">{t('templates.empty')}</p>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {t('templates.emptyDesc')}
            </p>
          </CardContent>
        </Card>
      )}

      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          customExercises={customExercises}
          workoutDays={workoutDays}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onLoad={(day, mode) => handleLoad(template, day, mode)}
        />
      ))}
    </div>
  )
}

export default TemplateManager
