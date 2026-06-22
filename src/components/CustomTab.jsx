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
} from 'lucide-react'import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { addExerciseToDay, removeExerciseFromDay } from '@/lib/workoutSchedule'
import { compressImageFile } from '@/lib/imageUtils'
import { formatExerciseTarget, getDurationLabel } from '@/lib/exerciseFormat'
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
import { shouldShowExerciseSetupPrompt } from '@/lib/planEmpty'
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
  const [activeTab, setActiveTab] = useState('exercises')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'schedule' || tab === 'exercises' || tab === 'templates') {
      setActiveTab(tab)
    }
  }, [searchParams])
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

  const customExercises = state.customExercises || []
  const showExerciseSetupPrompt = shouldShowExerciseSetupPrompt(state)
  const completedExercises = state.completedExercises || {}
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
        <h1 className="text-2xl font-bold mb-2">{t('exercises.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('exercises.pageSubtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="exercises">
            <Dumbbell className="h-4 w-4 mr-2" />
            {t('exercises.tabLibrary')}
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="h-4 w-4 mr-2" />
            {t('exercises.tabSchedule')}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <LayoutTemplate className="h-4 w-4 mr-2" />
            {t('exercises.tabTemplates')}
          </TabsTrigger>
        </TabsList>

        {/* EXERCISES TAB */}
        <TabsContent value="exercises" className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t('exercises.inLibrary', { count: customExercises.length })}
              </p>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <JsonFileActions
                  onTemplate={handleDownloadTemplate}
                  onExport={handleExportExercises}
                  onImportFileSelected={handleImportFileSelected}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setPresetBrowserOpen(true)}
                >
                  <Library className="h-4 w-4 mr-1" />
                  {t('exercises.presetBrowse')}
                </Button>
                <Button size="sm" className="shrink-0" onClick={() => setAddTypeOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('exercises.addExercise')}
                </Button>
              </div>
            </div>

            <Tabs
              value={exercisePhaseFilter}
              onValueChange={setExercisePhaseFilter}
              className="w-full"
            >
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
          </div>

          {customExercises.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t('exercises.emptyTitle')}</p>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  {t('exercises.emptyDesc')}
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
                  <AiRecommendButton
                    loading={aiLoading}
                    label={t('ai.exerciseLabel')}
                    onClick={handleAiExerciseRecommend}
                  />
                  <Button onClick={() => setAddTypeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('exercises.addExercise')}
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('templates')}>
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredExercises.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-sm text-muted-foreground text-center">
                  {t('exercises.noPhase', {
                    phase: getExercisePhaseLabel(exercisePhaseFilter),
                  })}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  variant="outline"
                  onClick={() => openAddExercise(exercisePhaseFilter)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('exercises.addPhase', {
                    phase: getExercisePhaseLabel(exercisePhaseFilter),
                  })}
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
                      updateState({
                        customExercises: customExercises.map((ex) =>
                          ex.id === exercise.id ? { ...ex, imageUrl: dataUrl, updatedAt: Date.now() } : ex
                        ),
                      })
                      toast.success(t('custom.toastImageUpdated'))
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : t('custom.toastImageFail')
                      )
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="schedule" className="space-y-4">
          <ScheduleManager
            workoutDays={workoutDays}
            workoutSchedule={workoutSchedule}
            customExercises={customExercises}
            state={state}
            updateState={updateState}
            aiLoading={aiLoading}
            onAiRecommend={handleAiExerciseRecommend}
            showExerciseSetupPrompt={showExerciseSetupPrompt}
            onAddExercise={() => {
              setActiveTab('exercises')
              setAddTypeOpen(true)
            }}
          />
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <TemplateManager state={state} updateState={updateState} />
        </TabsContent>
      </Tabs>

      <PresetExerciseBrowser
        open={presetBrowserOpen}
        onOpenChange={setPresetBrowserOpen}
        customExercises={customExercises}
        onAdd={handlePresetsAdded}
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
    const newExercise = {
      ...exerciseData,
      exercisePhase: phase,
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
    const updated = customExercises.map(ex =>
      ex.id === exerciseData.id ? { ...exerciseData, updatedAt: Date.now() } : ex
    )
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
      if (!formData.duration || Number(formData.duration) <= 0) {
        toast.error(t('custom.toastDurationRequired'))
        return
      }
      onSave(
        packSimplePhaseExercise(exercise, {
          name: formData.name,
          duration: formData.duration,
          durationUnit: formData.durationUnit,
          notes: formData.description,
          exercisePhase: formData.exercisePhase,
        })
      )
      return
    }

    onSave({
      ...formData,
      exercisePhase: normalizeExercisePhase(formData.exercisePhase),
      muscleGroup: formData.muscleGroups || [],
    })
  }

  const switchToMainForm = () => {
    setFormData((prev) => ({
      name: prev.name,
      description: prev.description || '',
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
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', isSimple ? 'max-w-md' : 'max-w-2xl')}>
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
              <div className="flex gap-2">
                {[EXERCISE_PHASE.WARMUP, EXERCISE_PHASE.COOLDOWN].map((phase) => (
                  <Button
                    key={phase}
                    type="button"
                    size="sm"
                    variant={formData.exercisePhase === phase ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        exercisePhase: phase,
                        category: phase === EXERCISE_PHASE.WARMUP ? 'Warm-up' : 'Cool-down',
                      }))
                    }
                  >
                    {getExercisePhaseLabel(phase)}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('custom.duration')}</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('custom.unit')}</label>
                  <select
                    value={formData.durationUnit || 'minutes'}
                    onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="minutes">{t('durationUnits.minutes')}</option>
                    <option value="seconds">{t('durationUnits.seconds')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('custom.noteOptional')}</label>
                <Input
                  placeholder="e.g., Light pace"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {!exercise && (
                <button
                  type="button"
                  onClick={switchToMainForm}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  {t('custom.switchToMainForm', {
                    defaultValue: 'Adding a main lift instead? Use full exercise form',
                  })}
                </button>
              )}
            </>
          ) : (
            <>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.exerciseType')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {EXERCISE_PHASE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (isSimplePhase(option.value)) {
                      setFormData((prev) =>
                        packSimplePhaseExercise(
                          { exercisePhase: option.value },
                          {
                            name: prev.name,
                            duration: '5',
                            durationUnit: 'minutes',
                            notes: prev.description,
                          }
                        )
                      )
                    } else {
                      setFormData((prev) => ({ ...prev, exercisePhase: option.value }))
                    }
                  }}
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
                    ...(isHold && !prev.duration && prev.restTime
                      ? { duration: prev.restTime }
                      : {}),
                  }))
                }}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="isTimeBased" className="text-sm font-medium">
                {t('custom.holdExerciseLabel', {
                  defaultValue: 'Hold exercise (plank, dead hang, wall sit, etc.)',
                })}
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
                <label className="text-sm font-medium">{t('custom.sets')}</label>
                <Input
                  type="number"
                  min="1"
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
                  placeholder={formData.isTimeBased ? 'e.g., 5' : 'e.g., 10 or 8-12'}
                  value={formData.reps}
                  onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.isTimeBased
                    ? getDurationLabel(formData.durationUnit || 'seconds')
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

          {/* Image Upload/URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('custom.exerciseImage')}</label>
            
            {/* Toggle between URL, File, and Paste */}
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

            {/* Image Preview */}
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
    onAdd(selected)
    setSelected([])
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
  aiLoading,
  onAiRecommend,
  showExerciseSetupPrompt,
  onAddExercise,
}) {
  const { t } = useTranslation()
  const [selectedDay, setSelectedDay] = useState(workoutDays[0] || null)
  const [isAddingDay, setIsAddingDay] = useState(false)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)

  const handleAddDays = (days) => {
    if (!days.length) return

    const newSchedule = { ...workoutSchedule }
    const addedDayNames = []

    days.forEach((day) => {
      if (workoutDays.includes(day)) return
      newSchedule[day] = {
        note: i18n.t('common.dayWorkout', { day, lng: 'en' }),
        exercises: [],
      }
      addedDayNames.push(day)
    })

    if (!addedDayNames.length) return

    updateState({
      profile: {
        ...state.profile,
        workoutDays: [...workoutDays, ...addedDayNames],
      },
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
    setIsAddingDay(false)
  }

  const handleRemoveDay = (day) => {
    if (
      !confirm(
        i18n.t('custom.scheduleConfirmRemove', { day: translateWeekday(day) })
      )
    )
      return

    const newSchedule = { ...workoutSchedule }
    delete newSchedule[day]

    updateState({
      profile: {
        ...state.profile,
        workoutDays: workoutDays.filter(d => d !== day)
      },
      workoutSchedule: newSchedule
    })

    toast.success(t('custom.scheduleDayRemoved', { day: translateWeekday(day) }))
    if (selectedDay === day) {
      setSelectedDay(workoutDays.filter(d => d !== day)[0] || null)
    }
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

  const addDayDialog = (
    <AddDaysDialog
      open={isAddingDay}
      onOpenChange={setIsAddingDay}
      workoutDays={workoutDays}
      onAdd={handleAddDays}
    />
  )

  const exerciseSetupCard = showExerciseSetupPrompt ? (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center justify-center py-8 px-4">
        <Dumbbell className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-base font-medium mb-1 text-center">{t('home.emptyTitle')}</p>
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
          {t('home.emptyDesc')}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <AiRecommendButton
            loading={aiLoading}
            label={t('ai.exerciseLabel')}
            onClick={onAiRecommend}
          />
          <Button variant="outline" onClick={onAddExercise}>
            <Plus className="h-4 w-4 mr-2" />
            {t('workout.addExercises')}
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : null

  if (workoutDays.length === 0) {
    return (
      <>
        {exerciseSetupCard}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('custom.noWorkoutDays')}</p>
            <p className="text-sm text-muted-foreground mb-4 text-center">{t('custom.addDayHint')}</p>
            <Button onClick={() => setIsAddingDay(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('custom.addWorkoutDay', { defaultValue: 'Add Workout Day' })}
            </Button>
          </CardContent>
        </Card>
        {addDayDialog}
      </>
    )
  }

  return (
    <div className="space-y-4">
      {exerciseSetupCard}
      {/* Day Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('report.workoutDays')}</CardTitle>
              <CardDescription>
                {t('common.days', { count: workoutDays.length })}
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddingDay(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('custom.addDay', { defaultValue: 'Add Day' })}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {workoutDays.map(day => (
              <button
                key={day}
                type="button"
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  selectedDay === day
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/30'
                )}
                onClick={() => setSelectedDay(day)}
              >
                {translateWeekday(day)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Details */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                {t('common.dayWorkout', { day: translateWeekday(selectedDay) })}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveDay(selectedDay)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t('custom.removeDay')}
              </Button>
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
                <div className="flex flex-wrap gap-2">
                  {(workoutSchedule[selectedDay]?.exercises?.length ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCopyDialogOpen(true)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {t('custom.copyDay')}
                    </Button>
                  )}
                  {customExercises.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingExercise(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('exercises.addExercise')}
                    </Button>
                  )}
                </div>
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

      {/* Add Exercise Dialog */}
      {isAddingExercise && selectedDay && (
        <AddExerciseToDayDialog
          day={selectedDay}
          customExercises={customExercises}
          onClose={() => setIsAddingExercise(false)}
          onAdd={(exerciseId, details) => {
            handleAddExerciseToDay(selectedDay, exerciseId, details)
            setIsAddingExercise(false)
          }}
        />
      )}

      {addDayDialog}
    </div>
  )
}

export default CustomTab
