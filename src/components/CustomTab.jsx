import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Dumbbell,
  Save,
  X,
  Upload,
  Link,
  Clock,
  Copy,
  Library,
  Clipboard,
  LayoutTemplate,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { addExerciseToDay, removeExerciseFromDay } from '@/lib/workoutSchedule'
import { compressImageFile } from '@/lib/imageUtils'
import { buildExerciseTarget, formatExerciseTarget, getHoldTimeLabel, normalizeHoldFields } from '@/lib/exerciseFormat'
import {
  EXERCISE_PHASE,
  EXERCISE_PHASE_OPTIONS,
  buildSimplePhaseDefaults,
  formatSimplePhaseTarget,
  getExercisePhaseBadgeClass,
  getExercisePhaseDescription,
  getExercisePhaseLabel,
  getExercisePhaseLongLabel,
  inferExercisePhase,
  isSimplePhase,
  normalizeExercisePhase,
  packSimplePhaseExercise,
} from '@/lib/exercisePhase'
import AddExerciseToDayDialog from './AddExerciseToDayDialog'
import CopyDayDialog from './CopyDayDialog'
import ScheduleExerciseList from './ScheduleExerciseList'
import { ExerciseLibraryCard } from './ExerciseCard'
import TemplateManager from './TemplateManager'
import { filterExerciseLibrary } from '@/lib/exerciseSearch'
import { getPersonalRecord } from '@/lib/personalRecords'
import { copyDaySchedule, reorderDayExercises } from '@/lib/workoutSchedule'
import {
  applyExerciseImport,
  downloadExerciseExport,
  downloadExerciseTemplate,
  IMPORT_MODE,
} from '@/lib/exerciseImport'
import { showImportWarnings } from '@/lib/importWarnings'
import ImportExerciseDialog from './ImportExerciseDialog'
import AiRecommendButton from './AiRecommendButton'
import JsonFileActions from './JsonFileActions'
import PresetExerciseBrowser from './PresetExerciseBrowser'
import ExerciseHistorySheet from './ExerciseHistorySheet'
import { EXERCISE_CATEGORIES } from '@/lib/presetExercises'
import { displayCategory } from '@/lib/exerciseFilterDisplay'
import { fetchExerciseRecommendation } from '@/lib/aiRecommendations'
import { getAiToastKey } from '@/lib/aiErrors'
import { shouldShowExerciseSetupPrompt, hasAnyExercises, isMealPlanEmpty, isShoppingListEmpty } from '@/lib/planEmpty'
import {
  allowsAiPlanFeatures,
  allowsTemplatePlanFeatures,
  getPlanSetupMethod,
} from '@/lib/planSetup'
import {
  EQUIPMENT_I18N_KEYS,
  MUSCLE_I18N_KEYS,
  translateWeekday,
} from '@/lib/i18nHelpers'

const sharedRadius = 'rounded-md'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DIFFICULTY_KEYS = ['beginner', 'intermediate', 'advanced']

function CustomTab({ state, updateState }) {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [newExercisePhase, setNewExercisePhase] = useState(EXERCISE_PHASE.MAIN)
  const [exercisePhaseFilter, setExercisePhaseFilter] = useState(EXERCISE_PHASE.MAIN)
  const [editingExercise, setEditingExercise] = useState(null)
  const [presetBrowserOpen, setPresetBrowserOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [historyExercise, setHistoryExercise] = useState(null)
  const [showTemplatesSection, setShowTemplatesSection] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [showUpdatePlan, setShowUpdatePlan] = useState(false)

  const customExercises = state.customExercises || []
  const showExerciseSetupPrompt = shouldShowExerciseSetupPrompt(state)
  const setupMethod = getPlanSetupMethod(state)
  const showAiFeatures = allowsAiPlanFeatures(state)
  const showTemplateFeatures = allowsTemplatePlanFeatures(state)
  const completedExercises = state.completedExercises || {}

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'schedule') {
      // scroll to schedule section after render
      setTimeout(() => {
        document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else if (tab === 'templates' && showTemplateFeatures) {
      setShowTemplatesSection(true)
    }
  }, [searchParams, showTemplateFeatures])

  const filteredExercises = useMemo(
    () =>
      filterExerciseLibrary(customExercises, {
        phase: exercisePhaseFilter,
      }),
    [customExercises, exercisePhaseFilter]
  )

  const handlePresetsAdded = (nextExercises, added) => {
    updateState({ customExercises: nextExercises })
    if (added.length === 1) {
      toast.success(t('custom.toastAdded', { name: added[0].name }))
    } else if (added.length > 1) {
      toast.success(t('exercises.presetAddedMany', { count: added.length }))
    }
  }

  const openAddExercise = (phase = EXERCISE_PHASE.MAIN) => {
    const normalized = normalizeExercisePhase(phase)
    setNewExercisePhase(normalized)
    setExercisePhaseFilter(normalized)
    setIsAddingExercise(true)
  }

  const closeExerciseDialog = () => {
    setIsAddingExercise(false)
    setEditingExercise(null)
    setNewExercisePhase(EXERCISE_PHASE.MAIN)
  }
  const workoutSchedule = state.workoutSchedule || {}
  const workoutDays = state.profile?.workoutDays || []

  const handleDownloadTemplate = () => {
    downloadExerciseTemplate()
    toast.success(t('custom.toastTemplate'))
  }

  const handleExportExercises = () => {
    downloadExerciseExport(state)
    toast.success(t('custom.toastExported'))
  }

  const handleImportFileSelected = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportFile(file)
    setImportDialogOpen(true)
  }

  const runExerciseImport = (file, mode) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const result = applyExerciseImport(state, parsed, mode)
        updateState({
          customExercises: result.customExercises,
          workoutSchedule: result.workoutSchedule,
          profile: result.profile,
        })
        const { exercisesAdded, scheduleEntriesAdded, daysAdded, warnings } =
          result.summary
        const parts = []
        if (exercisesAdded) parts.push(t('common.exercises', { count: exercisesAdded }))
        if (scheduleEntriesAdded) {
          parts.push(
            t('custom.importScheduleEntries', {
              count: scheduleEntriesAdded,
              defaultValue: `${scheduleEntriesAdded} schedule assignment(s)`,
            })
          )
        }
        if (daysAdded) parts.push(t('common.days', { count: daysAdded }))
        toast.success(
          parts.length
            ? t('custom.toastImported', { parts: parts.join(', ') })
            : t('custom.toastImportedEmpty')
        )
        showImportWarnings(warnings, { title: t('custom.importNotesTitle') })
      } catch (err) {
        toast.error(err.message || t('custom.toastImportFail'))
      } finally {
        setImportFile(null)
      }
    }
    reader.onerror = () => {
      toast.error(t('custom.toastReadFile'))
      setImportFile(null)
    }
    reader.readAsText(file)
  }

  const handleAiExerciseRecommend = async () => {
    setAiLoading(true)
    try {
      const parsed = await fetchExerciseRecommendation(state)
      const result = applyExerciseImport(state, parsed, IMPORT_MODE.APPEND)
      updateState({
        customExercises: result.customExercises,
        workoutSchedule: result.workoutSchedule,
        profile: result.profile,
      })
      const { exercisesAdded, scheduleEntriesAdded, warnings } = result.summary
      const parts = []
      if (exercisesAdded) parts.push(t('common.exercises', { count: exercisesAdded }))
      if (scheduleEntriesAdded) {
        parts.push(
          t('custom.importScheduleEntries', {
            count: scheduleEntriesAdded,
            defaultValue: `${scheduleEntriesAdded} schedule assignment(s)`,
          })
        )
      }
      toast.success(
        parts.length
          ? t('custom.toastAiAdded', {
              parts: parts.join(` ${t('common.and', { defaultValue: 'and' })} `),
              defaultValue: `AI added ${parts.join(' and ')}`,
            })
          : t('custom.toastAiApplied')
      )
      showImportWarnings(warnings, { title: t('custom.aiNotesTitle') })
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('exercises.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('exercises.pageSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* ── WORKOUT DAYS & SCHEDULE ───────────────────── */}
        <div id="schedule-section" className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t('exercises.tabSchedule')}
          </h2>
          <ScheduleManager
            workoutDays={workoutDays}
            workoutSchedule={workoutSchedule}
            customExercises={customExercises}
            state={state}
            updateState={updateState}
          />
        </div>

        {/* ── TEMPLATES (collapsible) ───────────────────── */}
        {showTemplateFeatures && (
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
              onClick={() => setShowTemplatesSection((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                {t('exercises.tabTemplates')}
              </span>
              {showTemplatesSection
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showTemplatesSection && (
              <TemplateManager
                state={state}
                updateState={updateState}
                showPresetTemplates={showTemplateFeatures}
              />
            )}
          </div>
        )}

        {/* ── EXERCISE LIBRARY (collapsible) ───────────── */}
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
            onClick={() => setLibraryOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span>{t('exercises.tabLibrary')}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({customExercises.length})
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={(e) => { e.stopPropagation(); setAddTypeOpen(true) }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('exercises.addExercise')}
              </Button>
              {libraryOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
            </span>
          </button>

          {libraryOpen && (
            <div className="space-y-4">
              {/* Phase filter */}
              <Tabs value={exercisePhaseFilter} onValueChange={setExercisePhaseFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/50 p-1">
                  {EXERCISE_PHASE_OPTIONS.map((option) => (
                    <TabsTrigger
                      key={option.value}
                      value={option.value}
                      className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      {getExercisePhaseLabel(option.value)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {customExercises.length === 0 ? (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-5 space-y-4">
                    <div>
                      <p className="font-medium">{t('exercises.emptyTitle')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t('exercises.emptyDesc')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AiRecommendButton
                        loading={aiLoading}
                        label={t('ai.exerciseLabel')}
                        onClick={handleAiExerciseRecommend}
                      />
                      <Button size="sm" variant="outline" onClick={() => setShowTemplatesSection(true)}>
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        Preset plans
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredExercises.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground text-center">
                      {t('exercises.noPhase', { phase: getExercisePhaseLabel(exercisePhaseFilter) })}
                    </p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => openAddExercise(exercisePhaseFilter)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('exercises.addPhase', { phase: getExercisePhaseLabel(exercisePhaseFilter) })}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredExercises.map((exercise) => (
                    <ExerciseLibraryCard
                      key={exercise.id}
                      exercise={exercise}
                      personalRecord={getPersonalRecord(completedExercises, exercise.id)?.label}
                      onEdit={() => setEditingExercise(exercise)}
                      onDelete={() => handleDeleteExercise(exercise.id)}
                      onHistory={() => setHistoryExercise(exercise)}
                      onUploadImage={async (file) => {
                        if (file.size > 5 * 1024 * 1024) { toast.error(t('custom.toastImageSize')); return }
                        try {
                          const dataUrl = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 })
                          updateState({ customExercises: customExercises.map((ex) => ex.id === exercise.id ? { ...ex, imageUrl: dataUrl, updatedAt: Date.now() } : ex) })
                          toast.success(t('custom.toastImageUpdated'))
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : t('custom.toastImageFail'))
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── UPDATE PLAN ───────────────────────────────── */}
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
            onClick={() => setShowUpdatePlan((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Update plan
            </span>
            {showUpdatePlan
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showUpdatePlan && (
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Regenerate your workout exercises using AI or a preset plan. This appends to your existing library — nothing is deleted automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <AiRecommendButton
                  loading={aiLoading}
                  label="AI exercise plan"
                  onClick={handleAiExerciseRecommend}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowUpdatePlan(false); setShowTemplatesSection(true) }}
                >
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Preset plans
                </Button>
              </div>
            </div>
          )}
        </div>

      </div>

      <PresetExerciseBrowser
        open={presetBrowserOpen}
        onOpenChange={setPresetBrowserOpen}
        customExercises={customExercises}
        onAdd={handlePresetsAdded}
        profileEquipment={state.profile?.equipment || []}
      />

      <ImportExerciseDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        file={importFile}
        onConfirm={runExerciseImport}
      />

      <Dialog open={addTypeOpen} onOpenChange={setAddTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('exercises.addTypeTitle')}</DialogTitle>
            <DialogDescription>{t('exercises.addTypeDesc')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setAddTypeOpen(false)
                setPresetBrowserOpen(true)
              }}
            >
              <Library className="h-4 w-4 mr-2 shrink-0" />
              {t('exercises.presetBrowse')}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setAddTypeOpen(false)
                openAddExercise(EXERCISE_PHASE.WARMUP)
              }}
            >
              {getExercisePhaseLabel(EXERCISE_PHASE.WARMUP)}
            </Button>
            <Button
              className="justify-start"
              onClick={() => {
                setAddTypeOpen(false)
                openAddExercise(EXERCISE_PHASE.MAIN)
              }}
            >
              {getExercisePhaseLabel(EXERCISE_PHASE.MAIN)}
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setAddTypeOpen(false)
                openAddExercise(EXERCISE_PHASE.COOLDOWN)
              }}
            >
              {getExercisePhaseLabel(EXERCISE_PHASE.COOLDOWN)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Exercise Dialog */}
      {(isAddingExercise || editingExercise) && (
        <ExerciseFormDialog
          exercise={editingExercise}
          defaultPhase={editingExercise ? undefined : newExercisePhase}
          onClose={closeExerciseDialog}
          onSave={(exerciseData) => {
            if (editingExercise) {
              handleUpdateExercise(exerciseData)
            } else {
              handleAddExercise(exerciseData)
            }
            closeExerciseDialog()
          }}
        />
      )}

      {/* Exercise History Sheet */}
      {historyExercise && (
        <ExerciseHistorySheet
          exercise={historyExercise}
          completedExercises={completedExercises}
          onClose={() => setHistoryExercise(null)}
        />
      )}

    </div>
  )

  function handleAddExercise(exerciseData) {
    const phase = normalizeExercisePhase(exerciseData.exercisePhase)
    const normalized = normalizeHoldFields(exerciseData)
    const newExercise = {
      ...normalized,
      exercisePhase: phase,
      target: buildExerciseTarget({
        isTimeBased: normalized.isTimeBased ?? false,
        sets: normalized.sets,
        reps: normalized.reps,
        duration: normalized.duration,
        durationUnit: normalized.durationUnit,
      }),
      id: Date.now().toString(),
      createdAt: Date.now(),
    }
    updateState({
      customExercises: [...customExercises, newExercise],
    })
    setExercisePhaseFilter(phase)
    toast.success(t('custom.toastAdded', { name: exerciseData.name }))
  }

  function handleUpdateExercise(exerciseData) {
    const updated = customExercises.map(ex => {
      if (ex.id !== exerciseData.id) return ex
      const normalized = normalizeHoldFields(exerciseData)
      return {
        ...normalized,
        target: buildExerciseTarget({
          isTimeBased: normalized.isTimeBased ?? false,
          sets: normalized.sets,
          reps: normalized.reps,
          duration: normalized.duration,
          durationUnit: normalized.durationUnit,
        }),
        updatedAt: Date.now(),
      }
    })
    updateState({ customExercises: updated })
    toast.success(t('custom.toastUpdated', { name: exerciseData.name }))
  }

  function handleDeleteExercise(id) {
    const exercise = customExercises.find(ex => ex.id === id)
    if (!exercise) return

    if (
      !confirm(
        i18n.t('custom.confirmDeleteExercise', {
          name: exercise.name,
          defaultValue: `Delete "${exercise.name}"? This will remove it from all workout days.`,
        })
      )
    )
      return

    // Remove from exercise library
    const updated = customExercises.filter(ex => ex.id !== id)

    // Remove from all workout schedules
    const updatedSchedule = { ...workoutSchedule }
    Object.keys(updatedSchedule).forEach(day => {
      updatedSchedule[day].exercises = updatedSchedule[day].exercises.filter(
        (ex) => ex.exerciseId !== id && ex.id !== id
      )
    })

    updateState({
      customExercises: updated,
      workoutSchedule: updatedSchedule
    })
    toast.success(t('custom.toastDeleted', { name: exercise.name }))
  }
}

function ExerciseFormDialog({ exercise, defaultPhase = EXERCISE_PHASE.MAIN, onClose, onSave }) {
  const { t } = useTranslation()
  const initialPhase = normalizeExercisePhase(exercise?.exercisePhase || defaultPhase)

  const equipmentOptions = useMemo(
    () =>
      EQUIPMENT_I18N_KEYS.map((key) => ({
        value: i18n.t(`equipment.${key}`, { lng: 'en' }),
        label: t(`equipment.${key}`),
      })),
    [t, i18n.language]
  )

  const muscleOptions = useMemo(
    () =>
      MUSCLE_I18N_KEYS.map((key) => ({
        value: i18n.t(`muscles.${key}`, { lng: 'en' }),
        label: t(`muscles.${key}`),
      })),
    [t, i18n.language]
  )

  const difficultyOptions = useMemo(
    () =>
      DIFFICULTY_KEYS.map((key) => ({
        value: i18n.t(`difficulty.${key}`, { lng: 'en' }),
        label: t(`difficulty.${key}`),
      })),
    [t, i18n.language]
  )

  const defaultEquipment = i18n.t('equipment.dumbbell', { lng: 'en' })
  const defaultDifficulty = i18n.t('difficulty.beginner', { lng: 'en' })

  const [formData, setFormData] = useState(() => {
    if (exercise) {
      return { ...exercise, exercisePhase: normalizeExercisePhase(exercise.exercisePhase) }
    }
    if (isSimplePhase(initialPhase)) {
      return buildSimplePhaseDefaults(initialPhase)
    }
    return {
      name: '',
      description: '',
      sets: '3',
      reps: '10',
      restTime: '60',
      equipment: defaultEquipment,
      difficulty: defaultDifficulty,
      muscleGroups: [],
      imageUrl: '',
      instructions: '',
      tips: '',
      category: 'Strength',
      isTimeBased: false,
      duration: '30',
      durationUnit: 'seconds',
      exercisePhase: EXERCISE_PHASE.MAIN,
    }
  })
  const [imageInputType, setImageInputType] = useState('file')
  const [imagePreview, setImagePreview] = useState(exercise?.imageUrl || '')
  const imageFileInputRef = useRef(null)
  const isSimple = isSimplePhase(formData.exercisePhase)
  const simplePhaseLabel = getExercisePhaseLabel(formData.exercisePhase)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('custom.toastNameRequired'))
      return
    }

    if (isSimple) {
      if (formData.isTimeBased) {
        if (!formData.duration?.toString().trim() || Number(formData.duration) <= 0) {
          toast.error(t('custom.toastHoldTimeRequired'))
          return
        }
      } else if (!formData.reps || !formData.reps.toString().trim()) {
        toast.error(t('dialogs.addToDay.toastReps', { defaultValue: 'Please enter reps.' }))
        return
      }
      const phase = normalizeExercisePhase(formData.exercisePhase)
      const payload = {
        ...formData,
        exercisePhase: phase,
        isTimeBased: !!formData.isTimeBased,
        restTime: '',
        ...(formData.isTimeBased ? { sets: '0', reps: '0' } : { duration: '', durationUnit: 'seconds' }),
        category: phase === EXERCISE_PHASE.WARMUP ? 'Warm-up' : 'Cool-down',
        muscleGroups: [],
        muscleGroup: [],
        equipment: '',
        difficulty: '',
        imageUrl: formData.imageUrl || '',
        instructions: '',
        tips: '',
      }
      onSave(formData.isTimeBased ? normalizeHoldFields(payload) : payload)
      return
    }

    if (formData.isTimeBased) {
      if (!formData.duration || Number(formData.duration) <= 0) {
        toast.error(t('custom.toastDurationRequired'))
        return
      }
    } else {
      if (!formData.reps || !formData.reps.toString().trim()) {
        toast.error(t('dialogs.addToDay.toastReps', { defaultValue: 'Please enter reps.' }))
        return
      }
    }

    onSave(normalizeHoldFields({
      ...formData,
      exercisePhase: normalizeExercisePhase(formData.exercisePhase),
      muscleGroup: formData.muscleGroups || [],
    }))
  }

  const toggleMuscleGroup = (muscle) => {
    setFormData(prev => ({
      ...prev,
      muscleGroups: prev.muscleGroups.includes(muscle)
        ? prev.muscleGroups.filter(m => m !== muscle)
        : [...prev.muscleGroups, muscle]
    }))
  }

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('custom.toastImageSize'))
      return
    }

    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.75,
      })
      setFormData({ ...formData, imageUrl: dataUrl })
      setImagePreview(dataUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('custom.toastImageFail'))
    }
  }

  const openImagePicker = () => {
    setImageInputType('file')
    imageFileInputRef.current?.click?.()
  }

  const handlePasteImage = async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast.error(t('custom.toastPasteUnsupported', { defaultValue: 'Clipboard access not supported in this browser.' }))
        return
      }
      const items = await navigator.clipboard.read()
      let found = false
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          found = true
          const blob = await item.getType(imageType)
          const file = new File([blob], `paste.${imageType.split('/')[1] || 'png'}`, { type: imageType })
          if (file.size > 5 * 1024 * 1024) {
            toast.error(t('custom.toastImageSize'))
            return
          }
          const dataUrl = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 })
          setFormData((prev) => ({ ...prev, imageUrl: dataUrl }))
          setImagePreview(dataUrl)
          setImageInputType('file')
          toast.success(t('custom.toastImagePasted', { defaultValue: 'Image pasted from clipboard.' }))
          break
        }
      }
      if (!found) {
        toast.error(t('custom.toastPasteNoImage', { defaultValue: 'No image found in clipboard.' }))
      }
    } catch {
      toast.error(t('custom.toastPasteFail', { defaultValue: 'Could not read clipboard. Allow clipboard access and try again.' }))
    }
  }

  const handleImageUrlChange = (url) => {
    setFormData({ ...formData, imageUrl: url })
    setImagePreview(url)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', isSimple ? 'max-w-lg' : 'max-w-2xl')}>
        <DialogHeader>
          <DialogTitle>
            {exercise
              ? isSimple
                ? formData.exercisePhase === EXERCISE_PHASE.WARMUP
                  ? t('custom.formEditWarmup')
                  : t('custom.formEditCooldown')
                : t('custom.formEditExercise')
              : isSimple
                ? t('exercises.addPhase', { phase: simplePhaseLabel })
                : t('custom.formAddMain')}
          </DialogTitle>
          <DialogDescription>
            {isSimple ? t('custom.formDescSimple') : t('custom.formDescMain')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.name')}</label>
            <Input
              placeholder={isSimple ? 'e.g., Arm circles, Hamstring stretch' : 'e.g., Barbell Bench Press'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {isSimple ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="simpleIsTimeBased"
                    checked={formData.isTimeBased}
                    onChange={(e) => {
                      const isHold = e.target.checked
                      setFormData((prev) => ({
                        ...prev,
                        isTimeBased: isHold,
                        ...(isHold
                          ? {
                              sets: '0',
                              reps: '0',
                              duration: prev.duration || '30',
                            }
                          : {
                              sets: prev.sets === '0' ? '3' : prev.sets || '3',
                              reps: prev.reps === '0' ? '10' : prev.reps || '10',
                              duration: '',
                            }),
                      }))
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="simpleIsTimeBased" className="text-sm font-medium">
                    {t('custom.holdExerciseType')}
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('custom.simpleHoldHint')}
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
                {formData.isTimeBased ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {getHoldTimeLabel(formData.durationUnit || 'seconds')}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('custom.unit')}</label>
                      <select
                        value={formData.durationUnit || 'seconds'}
                        onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="seconds">{t('durationUnits.seconds')}</option>
                        <option value="minutes">{t('durationUnits.minutes')}</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('custom.sets')}</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="3"
                        value={formData.sets}
                        onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('dialogs.addToDay.reps')}</label>
                      <Input
                        placeholder="10"
                        value={formData.reps}
                        onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('custom.noteOptional')}</label>
                <textarea
                  rows="3"
                  placeholder={t('custom.noteOptional')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </>
          ) : (
            <>
          {/* Phase selector — main exercises only */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.exerciseType')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {EXERCISE_PHASE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      exercisePhase: option.value,
                      category:
                        option.value === EXERCISE_PHASE.WARMUP
                          ? 'Warm-up'
                          : option.value === EXERCISE_PHASE.COOLDOWN
                            ? 'Cool-down'
                            : prev.category === 'Warm-up' || prev.category === 'Cool-down'
                              ? 'Strength'
                              : prev.category,
                    }))
                  }
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    formData.exercisePhase === option.value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="text-sm font-medium">
                    {getExercisePhaseLongLabel(option.value)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getExercisePhaseDescription(option.value)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.description')}</label>
            <textarea
              rows="2"
              placeholder="Brief description of the exercise"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Sets, Reps, Duration / Rest */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTimeBased"
                checked={formData.isTimeBased}
                onChange={(e) => {
                  const isHold = e.target.checked
                  setFormData((prev) => ({
                    ...prev,
                    isTimeBased: isHold,
                    ...(isHold
                      ? {
                          sets: '0',
                          reps: '0',
                          ...(!prev.duration && prev.restTime ? { duration: prev.restTime } : {}),
                        }
                      : {
                          sets: prev.sets === '0' ? '3' : prev.sets,
                          reps: prev.reps === '0' ? '10' : prev.reps,
                        }),
                  }))
                }}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="isTimeBased" className="text-sm font-medium">
                {t('custom.holdExerciseLabel')}
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.isTimeBased ? t('custom.holdHint') : t('custom.restHint')}
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {formData.isTimeBased ? t('custom.setsRepsDuration') : t('custom.setsRepsRest')}
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.isTimeBased
                    ? t('dialogs.addToDay.setsOptional', { defaultValue: 'Sets (optional)' })
                    : t('custom.sets')}
                </label>
                <Input
                  type="number"
                  min={formData.isTimeBased ? '0' : '1'}
                  placeholder={formData.isTimeBased ? '0' : undefined}
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.isTimeBased
                    ? t('dialogs.addToDay.repsOptional')
                    : t('dialogs.addToDay.reps')}
                </label>
                <Input
                  placeholder={formData.isTimeBased ? '0' : 'e.g., 10 or 8-12'}
                  value={formData.reps}
                  onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.isTimeBased
                    ? getHoldTimeLabel(formData.durationUnit || 'seconds')
                    : t('custom.restSec')}
                </label>
                {formData.isTimeBased ? (
                  <Input
                    type="number"
                    min="1"
                    placeholder="60"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                ) : (
                  <Input
                    type="number"
                    min="0"
                    step="15"
                    value={formData.restTime}
                    onChange={(e) => setFormData({ ...formData, restTime: e.target.value })}
                  />
                )}
              </div>
            </div>
            {formData.isTimeBased && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('dialogs.addToDay.durationUnit')}</label>
                <select
                  value={formData.durationUnit || 'seconds'}
                  onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="seconds">{t('durationUnits.seconds')}</option>
                  <option value="minutes">{t('durationUnits.minutes')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('exercises.filterCategory')}</label>
            <select
              value={formData.category || 'Strength'}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {EXERCISE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {displayCategory(cat, t)}
                </option>
              ))}
            </select>
          </div>

          {/* Equipment & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('custom.equipment')}</label>
              <select
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq.value} value={eq.value}>
                    {eq.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('custom.difficulty')}</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {difficultyOptions.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Muscle Groups */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.targetMuscles')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {muscleOptions.map((muscle) => (
                <Button
                  key={muscle.value}
                  type="button"
                  variant={formData.muscleGroups.includes(muscle.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleMuscleGroup(muscle.value)}
                  className="text-xs"
                >
                  {muscle.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.instructions')}</label>
            <textarea
              rows="4"
              placeholder={t('custom.instructionsPlaceholder')}
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.tips')}</label>
            <textarea
              rows="3"
              placeholder={t('custom.tipsPlaceholder')}
              value={formData.tips}
              onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
            </>
          )}

          {/* Image Upload/URL — shared by main, warm-up, and cool-down forms */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.exerciseImage')}</label>

            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={imageInputType === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImageInputType('url')}
                className="flex-1"
              >
                <Link className="h-4 w-4 mr-2" />
                {t('custom.imageUrl')}
              </Button>
              <Button
                type="button"
                variant={imageInputType === 'file' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setImageInputType('file')}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('custom.uploadFile')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteImage}
                className="flex-1"
                title={t('custom.pasteClipboard', { defaultValue: 'Paste from clipboard' })}
              >
                <Clipboard className="h-4 w-4 mr-2" />
                {t('custom.pasteClipboard', { defaultValue: 'Paste' })}
              </Button>
            </div>

            {imageInputType === 'url' ? (
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={openImagePicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openImagePicker()
                }}
                onPaste={async (e) => {
                  const item = Array.from(e.clipboardData?.items || []).find((i) =>
                    i.type.startsWith('image/')
                  )
                  if (item) {
                    e.preventDefault()
                    const file = item.getAsFile()
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) { toast.error(t('custom.toastImageSize')); return }
                    try {
                      const dataUrl = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 })
                      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }))
                      setImagePreview(dataUrl)
                      toast.success(t('custom.toastImagePasted', { defaultValue: 'Image pasted from clipboard.' }))
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : t('custom.toastImageFail'))
                    }
                  }
                }}
                aria-label={t('custom.uploadAria')}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="image-upload"
                  ref={imageFileInputRef}
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t('custom.uploadHint')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('custom.uploadFormats')}</p>
                </label>
              </div>
            )}

            {imagePreview && (
              <div className="relative mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg cursor-pointer"
                  onClick={openImagePicker}
                  onError={() => {
                    setImagePreview('')
                    toast.error(t('custom.toastImageLoadFail'))
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => {
                    setFormData({ ...formData, imageUrl: '' })
                    setImagePreview('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {exercise ? t('common.update') : t('custom.addExerciseBtn')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AddDaysDialog({ open, onOpenChange, workoutDays, onAdd }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState([])

  // Reset selection whenever dialog opens
  const handleOpenChange = (o) => {
    if (!o) setSelected([])
    onOpenChange(o)
  }

  const toggle = (day) => {
    if (workoutDays.includes(day)) return
    setSelected((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleConfirm = () => {
    const toAdd = selected
    setSelected([])
    onOpenChange(false)
    onAdd(toAdd)
  }

  const availableCount = DAYS_OF_WEEK.filter((d) => !workoutDays.includes(d)).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('custom.addWorkoutDay', { defaultValue: 'Add Workout Days' })}
          </DialogTitle>
          <DialogDescription>
            {t('custom.addWorkoutDayDesc', {
              defaultValue: 'Select one or more days to add to your schedule.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {DAYS_OF_WEEK.map((day) => {
            const alreadyAdded = workoutDays.includes(day)
            const isSelected = selected.includes(day)
            return (
              <button
                key={day}
                type="button"
                disabled={alreadyAdded}
                onClick={() => toggle(day)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left',
                  alreadyAdded
                    ? 'border-border bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                      : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                {/* Checkbox indicator */}
                <span
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                    alreadyAdded
                      ? 'border-muted-foreground/30 bg-muted/40'
                      : isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/40'
                  )}
                >
                  {(isSelected || alreadyAdded) && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                <span className="flex-1">{translateWeekday(day)}</span>

                {alreadyAdded && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {t('custom.alreadyAdded', { defaultValue: 'Added' })}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {availableCount === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-1">
            {t('custom.allDaysAdded', { defaultValue: 'All days are already in your schedule.' })}
          </p>
        ) : (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              className="flex-1"
              disabled={selected.length === 0}
              onClick={handleConfirm}
            >
              {selected.length === 0
                ? t('custom.addDay', { defaultValue: 'Add Days' })
                : t('custom.addDayCount', {
                    count: selected.length,
                    defaultValue: `Add ${selected.length} day${selected.length > 1 ? 's' : ''}`,
                  })}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScheduleManager({
  workoutDays,
  workoutSchedule,
  customExercises,
  state,
  updateState,
}) {
  const { t } = useTranslation()
  const [selectedDay, setSelectedDay] = useState(workoutDays[0] || null)
  const [isAddingExerciseToDay, setIsAddingExerciseToDay] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [removeConfirmDay, setRemoveConfirmDay] = useState(null)

  // Keep selectedDay in sync when workoutDays changes
  useEffect(() => {
    if (selectedDay && workoutDays.includes(selectedDay)) return
    setSelectedDay(workoutDays[0] || null)
  }, [workoutDays])

  const handleToggleDay = (day) => {
    const currentWorkoutDays = state.profile?.workoutDays || []
    const currentSchedule = state.workoutSchedule || {}
    const isActive = currentWorkoutDays.includes(day)

    if (!isActive) {
      const newSchedule = {
        ...currentSchedule,
        [day]: { note: i18n.t('common.dayWorkout', { day, lng: 'en' }), exercises: [] },
      }
      updateState({
        profile: { ...state.profile, workoutDays: [...currentWorkoutDays, day] },
        workoutSchedule: newSchedule,
      })
      toast.success(t('custom.scheduleDayAdded', { day: translateWeekday(day) }))
      setSelectedDay(day)
    }
  }

  const handleRemoveDay = (day) => {
    const currentWorkoutDays = state.profile?.workoutDays || []
    const currentSchedule = state.workoutSchedule || {}
    const newSchedule = { ...currentSchedule }
    delete newSchedule[day]
    updateState({
      profile: { ...state.profile, workoutDays: currentWorkoutDays.filter(d => d !== day) },
      workoutSchedule: newSchedule,
    })
    toast.success(t('custom.scheduleDayRemoved', { day: translateWeekday(day) }))
    if (selectedDay === day) {
      setSelectedDay(currentWorkoutDays.filter(d => d !== day)[0] || null)
    }
    setRemoveConfirmDay(null)
  }

  const handleAddDays = (days) => {
    if (!days.length) return
    const currentWorkoutDays = state.profile?.workoutDays || []
    const currentSchedule = state.workoutSchedule || {}
    const newSchedule = { ...currentSchedule }
    const addedDayNames = []
    days.forEach((day) => {
      if (currentWorkoutDays.includes(day)) return
      newSchedule[day] = {
        note: i18n.t('common.dayWorkout', { day, lng: 'en' }),
        exercises: [],
      }
      addedDayNames.push(day)
    })
    if (!addedDayNames.length) return
    updateState({
      profile: { ...state.profile, workoutDays: [...currentWorkoutDays, ...addedDayNames] },
      workoutSchedule: newSchedule,
    })
    if (addedDayNames.length === 1) {
      toast.success(t('custom.scheduleDayAdded', { day: translateWeekday(addedDayNames[0]) }))
    } else {
      toast.success(
        t('custom.scheduleDaysAdded', {
          days: addedDayNames.map(translateWeekday).join(', '),
          defaultValue: `Added ${addedDayNames.map(translateWeekday).join(', ')}`,
        })
      )
    }
    setSelectedDay(addedDayNames[addedDayNames.length - 1])
  }

  const handleUpdateDayNote = (day, note) => {
    const newSchedule = {
      ...workoutSchedule,
      [day]: {
        ...workoutSchedule[day],
        note
      }
    }
    updateState({ workoutSchedule: newSchedule })
  }

  const handleAddExerciseToDay = (day, exerciseId, details) => {
    const newSchedule = addExerciseToDay(
      workoutSchedule,
      day,
      customExercises,
      exerciseId,
      details
    )
    if (!newSchedule) return

    const exercise = customExercises.find((ex) => ex.id === exerciseId)
    updateState({ workoutSchedule: newSchedule })
    toast.success(
      t('custom.scheduleAddedToDay', {
        name: exercise.name,
        day: translateWeekday(day),
      })
    )
  }

  const handleRemoveExerciseFromDay = (day, exerciseId) => {
    const daySchedule = workoutSchedule[day]
    if (!daySchedule) return

    const exercise = daySchedule.exercises.find(ex => ex.id === exerciseId)
    if (!exercise) return

    if (
      !confirm(
        i18n.t('custom.scheduleConfirmRemoveEx', {
          name: exercise.name,
          day: translateWeekday(day),
        })
      )
    )
      return

    const newSchedule = removeExerciseFromDay(workoutSchedule, day, exerciseId)
    if (!newSchedule) return

    updateState({ workoutSchedule: newSchedule })
    toast.success(
      t('custom.scheduleRemovedFromDay', {
        name: exercise.name,
        day: translateWeekday(day),
      })
    )
  }

  const handleCopyDay = (targetDays, replace) => {
    const newSchedule = copyDaySchedule(workoutSchedule, selectedDay, targetDays, { replace })
    if (!newSchedule) {
      toast.error(t('custom.scheduleNothingToCopy'))
      return
    }
    updateState({ workoutSchedule: newSchedule })
    toast.success(
      t('custom.scheduleCopied', {
        day: translateWeekday(selectedDay),
        targets: targetDays.map((d) => translateWeekday(d)).join(', '),
      })
    )
  }

  const handleReorder = (fromIndex, toIndex) => {
    const newSchedule = reorderDayExercises(workoutSchedule, selectedDay, fromIndex, toIndex)
    if (newSchedule) updateState({ workoutSchedule: newSchedule })
  }

  const handleUpdateScheduleEntry = (day, updatedEntry) => {
    const daySchedule = workoutSchedule[day]
    if (!daySchedule) return
    const newSchedule = {
      ...workoutSchedule,
      [day]: {
        ...daySchedule,
        exercises: daySchedule.exercises.map((ex) =>
          ex.id === updatedEntry.id ? updatedEntry : ex
        ),
      },
    }
    updateState({ workoutSchedule: newSchedule })
    toast.success(
      t('custom.scheduleEntryUpdated', {
        name: updatedEntry.name,
        defaultValue: `Updated ${updatedEntry.name}`,
      })
    )
  }

  const dayPickerRow = (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      {/* 7-day grid — always one line */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => {
          const active = workoutDays.includes(day)
          const isSelected = selectedDay === day
          return (
            <button
              key={day}
              type="button"
              onClick={() => active ? setSelectedDay(day) : handleToggleDay(day)}
              className={cn(
                'rounded-md py-1.5 text-[11px] font-semibold text-center transition-all',
                active && isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : active
                    ? 'border border-primary/40 bg-primary/8 text-primary'
                    : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {translateWeekday(day).slice(0, 2)}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">
        {workoutDays.length === 0
          ? t('custom.addDayHint')
          : t('custom.workoutDaysCount', { count: workoutDays.length })}{' '}
        · Tap grey to add
      </p>
    </div>
  )

  if (workoutDays.length === 0) {
    return (
      <>
        {dayPickerRow}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {/* Day picker — toggle row */}
      {dayPickerRow}

      {/* Day Details */}
      {selectedDay && (
        <Card>
          <CardHeader className="pb-2 pt-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {translateWeekday(selectedDay)}
              </CardTitle>
              <div className="flex gap-1.5 shrink-0">
                {(workoutSchedule[selectedDay]?.exercises?.length ?? 0) > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setCopyDialogOpen(true)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {t('custom.copyDay')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setRemoveConfirmDay(selectedDay)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t('custom.removeDay')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Day Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('custom.dayNote')}</label>
              <Input
                placeholder="e.g., Push day - focus on chest and shoulders"
                value={workoutSchedule[selectedDay]?.note || ''}
                onChange={(e) => handleUpdateDayNote(selectedDay, e.target.value)}
              />
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium">{t('exercises.tabLibrary')}</label>
                {customExercises.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddingExerciseToDay(true)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('exercises.addExercise')}
                  </Button>
                )}
              </div>

              {workoutSchedule[selectedDay]?.exercises.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <p className="text-sm text-muted-foreground">
                    {t('custom.scheduleNoExercises', {
                      defaultValue: 'No exercises added yet',
                    })}
                  </p>
                </div>
              ) : (
                <ScheduleExerciseList
                  exercises={workoutSchedule[selectedDay].exercises}
                  onReorder={handleReorder}
                  onRemove={(id) => handleRemoveExerciseFromDay(selectedDay, id)}
                  onUpdate={(updatedEntry) => handleUpdateScheduleEntry(selectedDay, updatedEntry)}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CopyDayDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        fromDay={selectedDay}
        workoutDays={workoutDays}
        exerciseCount={workoutSchedule[selectedDay]?.exercises?.length ?? 0}
        onCopy={handleCopyDay}
      />

      {isAddingExerciseToDay && selectedDay && (
        <AddExerciseToDayDialog
          day={selectedDay}
          customExercises={customExercises}
          onClose={() => setIsAddingExerciseToDay(false)}
          onAdd={(entries) => {
            let schedule = workoutSchedule
            for (const { exerciseId, details } of entries) {
              const newSchedule = addExerciseToDay(schedule, selectedDay, customExercises, exerciseId, details)
              if (newSchedule) schedule = newSchedule
            }
            updateState({ workoutSchedule: schedule })
            const names = entries
              .map(({ exerciseId }) => customExercises.find((ex) => ex.id === exerciseId)?.name)
              .filter(Boolean)
            if (names.length === 1) {
              toast.success(t('custom.scheduleAddedToDay', { name: names[0], day: translateWeekday(selectedDay) }))
            } else if (names.length > 1) {
              toast.success(t('dialogs.addToDay.addedCount', { count: names.length, defaultValue: `Added ${names.length} exercises to ${translateWeekday(selectedDay)}` }))
            }
          }}
        />
      )}

      {/* Remove day confirmation dialog */}
      <Dialog open={!!removeConfirmDay} onOpenChange={(open) => { if (!open) setRemoveConfirmDay(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {i18n.t('custom.scheduleConfirmRemoveTitle', {
                day: translateWeekday(removeConfirmDay || ''),
                defaultValue: `Remove ${translateWeekday(removeConfirmDay || '')}?`,
              })}
            </DialogTitle>
            <DialogDescription>
              {i18n.t('custom.scheduleConfirmRemoveDesc', {
                defaultValue: 'This will remove the day and all its exercises from your schedule. This cannot be undone.',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setRemoveConfirmDay(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleRemoveDay(removeConfirmDay)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {t('custom.removeDay')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default CustomTab
