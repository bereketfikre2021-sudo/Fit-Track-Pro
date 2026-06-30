import { useTranslation } from 'react-i18next'
import {
  Dumbbell,
  CheckCircle,
  Circle,
  X,
  Play,
  Trophy,
  Edit2,
  Trash2,
  SkipForward,
  BarChart2,
} from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { formatExerciseTarget } from '@/lib/exerciseFormat'
import {
  formatSimplePhaseTarget,
  getExercisePhaseBadgeClass,
  getExercisePhaseLabel,
  inferExercisePhase,
  isSimplePhase,
} from '@/lib/exercisePhase'
import { parseRestSeconds } from '@/lib/restTimer'
import { parseHoldSeconds } from '@/lib/holdTimer'
import { isHoldExercise } from '@/lib/exerciseFormat'
import {
  migrateCompletionEntry,
  formatSetsSummary,
  buildDefaultSets,
} from '@/lib/setLogging'
import SetLogEditor from './SetLogEditor'
import {
  getLastSessionSummary,
  getPersonalRecord,
  isNewPersonalRecord,
} from '@/lib/personalRecords'
import { todayDateString, completionKey } from '@/lib/workoutSession'
import { getSkipReasonLabel, isSkippedEntry } from '@/lib/exerciseSkip'
import { useRef } from 'react'

const sharedRadius = 'rounded-md'

function ExerciseThumbnail({ exercise, isCompleted, className, onClick }) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] flex-shrink-0 overflow-hidden relative',
        sharedRadius,
        onClick && 'cursor-pointer',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
      aria-label={onClick ? t('exerciseCard.editImage') : undefined}
    >
      {exercise.imageUrl ? (
        <img
          src={exercise.imageUrl}
          alt={exercise.name}
          className={cn(
            'w-full h-full',
            // GIFs: contain so animation isn't cropped; static images: cover
            exercise.imageUrl.includes('.gif') || exercise.imageUrl.startsWith('data:image/gif')
              ? 'object-contain'
              : 'object-cover',
            sharedRadius
          )}
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      ) : (
        <div
          className={cn(
            'w-full h-full bg-muted flex items-center justify-center',
            sharedRadius
          )}
        >
          <Dumbbell className="h-7 w-7 text-muted-foreground opacity-50" />
        </div>
      )}
      {isCompleted && (
        <div className="absolute bottom-1 left-1 h-5 w-5 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center">
          <CheckCircle className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </div>
  )
}

function MuscleTags({ groups, limit = 4 }) {
  if (!groups?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {groups.slice(0, limit).map((muscle) => (
        <span
          key={muscle}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none"
        >
          {muscle}
        </span>
      ))}
    </div>
  )
}

/** Library list card (Exercises tab) */
export function ExerciseLibraryCard({
  exercise,
  personalRecord,
  onEdit,
  onDelete,
  onUploadImage,
  onHistory,
}) {
  const { t } = useTranslation()
  const phase = inferExercisePhase(exercise)
  const isSimple = isSimplePhase(phase)
  const fileInputRef = useRef(null)

  const openPicker = () => {
    fileInputRef.current?.click?.()
  }

  return (
    <Card className={cn('p-3 hover:shadow-md transition-shadow', sharedRadius)}>
      <div className="flex gap-3">
        <ExerciseThumbnail
          exercise={exercise}
          onClick={onUploadImage ? openPicker : onEdit}
        />
        {onUploadImage && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadImage(file)
              // allow picking the same file again
              e.target.value = ''
            }}
          />
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold leading-tight">
                  {exercise.name}
                </h3>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0',
                    getExercisePhaseBadgeClass(phase)
                  )}
                >
                  {getExercisePhaseLabel(phase)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatExerciseTarget(exercise)}
                {!isSimple &&
                  exercise.restTime &&
                  ` · ${t('exerciseCard.restSec', { sec: exercise.restTime })}`}
              </p>
              {!isSimple && (exercise.difficulty || exercise.equipment) && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {exercise.difficulty && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground leading-none">
                      {exercise.difficulty}
                    </span>
                  )}
                  {exercise.equipment && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground leading-none">
                      {exercise.equipment}
                    </span>
                  )}
                </div>
              )}
              {!isSimple && <MuscleTags groups={exercise.muscleGroups} />}
              {!isSimple && personalRecord && (
                <p className="text-[10px] text-primary mt-1">
                  {t('exerciseCard.pr', { label: personalRecord })}
                </p>
              )}
              {exercise.description && (
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {exercise.description}
                </p>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              {!isSimple && onHistory && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={onHistory} title="View history">
                  <BarChart2 className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Workout day card — compact layout (image, target, complete) */
export function ExerciseWorkoutCard({
  exercise,
  customExercises,
  day,
  completedExercises,
  isCompleted,
  completionEntry,
  enableSetLogging = false,
  readOnly = false,
  onSaveEntry,
  onToggleComplete,
  onSkip,
  onUnskip,
  onRemoveFromDay,
  onStartRest,
  onStartHold,
}) {
  const { t } = useTranslation()
  const fullExercise =
    customExercises.find((ex) => ex.id === exercise.exerciseId || ex.id === exercise.id) ||
    exercise
  const phase = inferExercisePhase({ ...fullExercise, ...exercise })
  const isSimple = isSimplePhase(phase)
  const libraryId = exercise.exerciseId || fullExercise.id
  const today = todayDateString()
  const entryKey = completionKey(today, day, exercise.id)

  const migrated =
    migrateCompletionEntry(completionEntry, exercise, fullExercise) ||
    (enableSetLogging && onSaveEntry
      ? migrateCompletionEntry(
          { notes: '', sets: buildDefaultSets(exercise, fullExercise) },
          exercise,
          fullExercise
        )
      : null)
  const sets = migrated?.sets ?? []
  const skipped = isSkippedEntry(completionEntry)

  const pr = getPersonalRecord(completedExercises, libraryId, entryKey)
  const lastSession = getLastSessionSummary(completedExercises, libraryId)
  const isPr =
    sets.length > 0 &&
    isCompleted &&
    isNewPersonalRecord(completedExercises, libraryId, sets, entryKey)

  const restSeconds = parseRestSeconds(exercise.restTime || fullExercise.restTime, 60)
  const merged = { ...fullExercise, ...exercise }
  const isHold = isHoldExercise(merged)
  const holdSeconds = parseHoldSeconds(merged)
  const targetLabel = formatExerciseTarget(merged)
  const setsSummary = formatSetsSummary(sets)
  const showSetLogging = enableSetLogging && onSaveEntry && !readOnly

  return (
    <Card
      className={cn(
        'p-3 transition-shadow',
        !readOnly && 'hover:shadow-md',
        sharedRadius,
        isCompleted && 'ring-2 ring-primary',
        isPr && 'ring-2 ring-amber-500/80',
        skipped && 'ring-2 ring-amber-500/40 opacity-80'
      )}
    >
      <div className="flex gap-3">
        <ExerciseThumbnail exercise={merged} isCompleted={isCompleted} />
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold leading-tight">{exercise.name}</h3>
                {phase !== 'main' && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0',
                      getExercisePhaseBadgeClass(phase)
                    )}
                  >
                    {getExercisePhaseLabel(phase)}
                  </span>
                )}
                {isPr && (
                  <Badge className="text-[10px] h-5 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40">
                    <Trophy className="h-3 w-3 mr-0.5" />
                    {t('exerciseCard.prBadge')}
                  </Badge>
                )}
                {skipped && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 border-amber-500/50 text-amber-700 dark:text-amber-400"
                  >
                    {t('exerciseCard.skipped', {
                      reason: getSkipReasonLabel(completionEntry?.skipReason),
                    })}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {targetLabel}
                {!merged.isTimeBased &&
                  (merged.restTime || fullExercise.restTime) &&
                  ` · ${t('exerciseCard.restSec', { sec: merged.restTime || fullExercise.restTime })}`}
              </p>
              {/* Difficulty + Equipment inline */}
              {(fullExercise.difficulty || fullExercise.equipment) && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {fullExercise.difficulty && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground leading-none">
                      {fullExercise.difficulty}
                    </span>
                  )}
                  {fullExercise.equipment && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground leading-none">
                      {fullExercise.equipment}
                    </span>
                  )}
                </div>
              )}
              <MuscleTags groups={fullExercise.muscleGroups} />
              {lastSession && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('exerciseCard.last', { summary: lastSession.summary })}
                  <span className="opacity-70"> · {lastSession.date}</span>
                </p>
              )}
              {pr?.label && !isPr && (
                <p className="text-[10px] text-primary/90 mt-0.5">
                  {t('exerciseCard.pr', { label: pr.label })}
                </p>
              )}
              {!showSetLogging && setsSummary && (
                <p className="text-[10px] text-muted-foreground mt-1">{setsSummary}</p>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0">
              {isHold && !skipped && onStartHold && !readOnly && (
                <button
                  type="button"
                  onClick={() => onStartHold(holdSeconds, exercise.name)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-amber-600 hover:text-amber-500 transition-colors"
                  aria-label={t('exerciseCard.holdAria', { sec: holdSeconds })}
                  title={t('exerciseCard.holdAria', { sec: holdSeconds })}
                >
                  <Play className="h-4 w-4" />
                </button>
              )}
              {!skipped && onSkip && !readOnly && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-amber-600 transition-colors"
                  aria-label={t('exerciseCard.skipAria')}
                  title={t('exerciseCard.skipTitle')}
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              )}
              {skipped && onUnskip && !readOnly ? (
                <button
                  type="button"
                  onClick={onUnskip}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-amber-600 hover:text-primary transition-colors text-[10px] font-medium px-1"
                  aria-label={t('exerciseCard.undoSkipAria')}
                  title={t('exerciseCard.undoSkipTitle')}
                >
                  {t('common.undo')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleComplete}
                  disabled={skipped || readOnly || !onToggleComplete}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                  aria-label={
                    isCompleted ? t('exerciseCard.markIncomplete') : t('exerciseCard.markComplete')
                  }
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
              )}
              {onRemoveFromDay && (
                <button
                  type="button"
                  onClick={onRemoveFromDay}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={t('exerciseCard.removeFromDay')}
                  title={t('exerciseCard.removeFromDay')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showSetLogging && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              <SetLogEditor
                sets={sets}
                onChange={(nextSets) => onSaveEntry({ sets: nextSets })}
              />
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t('exerciseCard.sessionNotes')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('exerciseCard.sessionNotesPlaceholder')}
                  value={migrated?.notes ?? ''}
                  onChange={(e) => onSaveEntry({ notes: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default ExerciseLibraryCard
