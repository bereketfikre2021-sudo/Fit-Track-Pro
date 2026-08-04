import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import i18n from '@/i18n'
import PageBackground from '../components/PageBackground'
import GymFloatingPattern from '../components/GymFloatingPattern'
import { BACKGROUND_HOME } from '../lib/backgrounds'
import { saveAppState } from '../lib/storage'
import { hydrateAppStateFromBackup } from '../lib/appState'
import { translateGoal } from '@/lib/i18nHelpers'
import { EQUIPMENT_OPTIONS } from '@/lib/profileOptions'
import { useAuth } from '../lib/useAuth'
import { loadAllFromSupabase, syncUserProfile, syncBodyLog, syncMealSlot, syncWaterLog, syncWorkoutSession } from '../lib/supabaseDb'

import {
  calculateBmi,
  getBmiCategory,
  getWeightChangeInfo,
  suggestPrimaryGoal,
  suggestTargetWeightKg,
} from '../lib/profileUtils'

const GOAL_VALUES = ['strength', 'muscle', 'fat', 'endurance']
const GENDER_VALUES = ['male', 'female']
const FITNESS_LEVELS = [
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_ABBREV = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

/**
 * Extracts a display name from an email address.
 * e.g. "john.doe123@gmail.com" → "John Doe"
 *      "sarah_smith@yahoo.com" → "Sarah Smith"
 */
function nameFromEmail(email) {
  if (!email) return ''
  const local = email.split('@')[0] || ''
  // Split on dots, underscores, hyphens and numbers
  const parts = local.split(/[._\-0-9]+/).filter(Boolean)
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

function OnboardingPage({ profile, userEmail = '', onResume, onComplete }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canResume = !!profile?.name?.trim()

  // Pre-fill name from email if available, otherwise empty
  const [name, setName] = useState(() => nameFromEmail(userEmail))
  const [gender, setGender] = useState('male')
  const [currentWeight, setCurrentWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState('muscle')
  const [goalTouched, setGoalTouched] = useState(false)
  const [equipmentId, setEquipmentId] = useState('gym')
  const [fitnessLevel, setFitnessLevel] = useState('beginner')
  const [fitnessLevelTouched, setFitnessLevelTouched] = useState(false)
  const [workoutDays, setWorkoutDays] = useState(['Monday', 'Wednesday', 'Friday'])

  const toggleDay = (day) => {
    setWorkoutDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      // always keep in Mon→Sun order
      return DAYS_OF_WEEK.filter((d) => next.includes(d))
    })
  }

  const bmi = useMemo(
    () => calculateBmi(currentWeight, height),
    [currentWeight, height]
  )

  const bmiCategory = useMemo(() => getBmiCategory(bmi), [bmi])

  const suggestedTargetWeight = useMemo(
    () => suggestTargetWeightKg({ heightCm: height, gender }),
    [height, gender]
  )

  const weightChange = useMemo(
    () => getWeightChangeInfo(currentWeight, suggestedTargetWeight),
    [currentWeight, suggestedTargetWeight]
  )

  const suggestedGoal = useMemo(
    () =>
      suggestPrimaryGoal({
        bmi,
        bmiCategory,
        currentWeightKg: currentWeight,
        targetWeightKg: suggestedTargetWeight,
      }),
    [bmi, bmiCategory, currentWeight, suggestedTargetWeight]
  )

  useEffect(() => {
    if (goalTouched || suggestedGoal == null) return
    setGoal(suggestedGoal)
  }, [goalTouched, suggestedGoal])

  const handleImportData = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') {
          throw new Error(i18n.t('app.readFileError'))
        }
        const imported = hydrateAppStateFromBackup(text)
        saveAppState(imported)
        toast.success(t('onboarding.toastImportSuccess'))

        // If the user is signed in, push ALL imported data to Supabase
        // so their exercises, meals, workouts, body logs, and water logs
        // are stored in the cloud immediately after import.
        const userId = user?.id
        if (userId) {
          toast.info('Syncing your data to the cloud…', { duration: 3000 })
          try {
            // Profile
            if (imported.profile?.name) {
              await syncUserProfile(userId, imported.profile)
            }

            // Body logs
            for (const log of imported.bodyLogs || []) {
              await syncBodyLog(userId, log)
            }

            // Meal plan — sync each day+slot that has food items
            const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
            const SLOTS = ['breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed']
            for (const day of DAYS) {
              for (const slot of SLOTS) {
                const foods = imported.mealPlan?.[day]?.[slot]
                if (foods?.length) {
                  await syncMealSlot(userId, day, slot, foods)
                }
              }
            }

            // Water logs
            for (const [date, cups] of Object.entries(imported.waterLogs || {})) {
              await syncWaterLog(userId, date, cups)
            }

            // Completed workout sessions + their exercise logs
            for (const session of imported.completedSessions || []) {
              await syncWorkoutSession(userId, session, imported.completedExercises || {})
            }

            toast.success('All data synced to cloud!', { duration: 4000 })
          } catch (syncErr) {
            console.warn('[OnboardingPage] Sync after import failed:', syncErr?.message)
            toast.warning('Data imported locally. Cloud sync failed — it will retry when you next open the app.')
          }
        }

        window.location.replace('/')
      } catch (error) {
        toast.error(error.message || t('onboarding.toastImportFail'))
      }
    }
    reader.readAsText(file)
  }

  const handleComplete = () => {
    if (!name.trim()) {
      toast.error(t('onboarding.toastNameRequired'))
      return
    }
    onComplete({
      name: name.trim(),
      registrationDate: new Date().toISOString().slice(0, 10),
      birthDate: '',
      gender,
      currentWeight: currentWeight.trim(),
      height: height.trim(),
      targetWeight: suggestedTargetWeight != null ? String(suggestedTargetWeight) : '',
      avatarUrl: '',
      goal: suggestedGoal ?? goal,
      focusArea: 'full-body',
      equipment: EQUIPMENT_OPTIONS.find((o) => o.id === equipmentId)?.values || ['Gym'],
      fitnessLevel,
      fitnessLevelManual: fitnessLevelTouched,
      workoutDays: workoutDays.length > 0 ? workoutDays : ['Monday', 'Wednesday', 'Friday'],
    })
    navigate('/setup')
  }

  const handleResume = () => {
    onResume?.()
    toast.success(t('onboarding.toastWelcomeBack', { name: profile.name }))
    navigate('/')
  }

  return (
    <div className="min-h-dvh flex flex-col relative">
      <PageBackground
        src={BACKGROUND_HOME}
        imageClassName="opacity-45"
        overlayClassName="bg-background/65"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="text-center mb-6 shrink-0">
            <img
              src="/icon-192.png"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl mx-auto mb-4"
            />
            <h1 className="text-4xl font-display font-extrabold tracking-tight">FitTrack Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('onboarding.subtitle')}</p>
          </div>

          {canResume && (
            <Card className="w-full max-w-md p-4 mb-4 bg-card/95 border-primary/30 shadow-md shrink-0">
              <p className="text-sm font-semibold">
                {t('onboarding.welcomeBack', { name: profile.name })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {t('onboarding.continueProfileHint')}
              </p>
              <Button className="w-full h-9" onClick={handleResume}>
                {t('onboarding.continueProfile')}
              </Button>
            </Card>
          )}

          <div className="mb-5 text-center shrink-0">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.hasAccount')}{' '}
              <label
                htmlFor="import-file"
                className="inline-flex items-center gap-1 text-primary font-medium cursor-pointer hover:underline"
              >
                <Upload className="h-3.5 w-3.5" />
                {t('onboarding.importBackup')}
              </label>
            </p>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </div>

          <Card className="w-full max-w-md p-3 md:p-4 bg-card border-border/50 shadow-lg shrink-0">
            <div className="space-y-2">
              <div>
                <label htmlFor="onboarding-name" className="text-xs font-medium">
                  {t('onboarding.yourName')}
                </label>
                <Input
                  id="onboarding-name"
                  placeholder={t('onboarding.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="h-7 mt-0.5 text-sm"
                />
              </div>

              <div>
                <span className="text-xs font-medium">{t('onboarding.gender')}</span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {GENDER_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors text-center',
                        gender === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => setGender(value)}
                    >
                      {value === 'male' ? t('common.male') : t('common.female')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground leading-snug mb-1">
                  {t('onboarding.bodyMetricsHint')}
                </p>
                <div className="grid grid-cols-3 gap-1 items-end">
                  <div className="min-w-0">
                    <label htmlFor="onboarding-weight" className="text-[10px] font-medium text-muted-foreground">
                      {t('onboarding.weightShort')}
                    </label>
                    <Input
                      id="onboarding-weight"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="70"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="h-7 mt-0.5 text-sm px-2"
                      aria-label={t('onboarding.weight')}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="onboarding-height" className="text-[10px] font-medium text-muted-foreground">
                      {t('onboarding.heightShort')}
                    </label>
                    <Input
                      id="onboarding-height"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-7 mt-0.5 text-sm px-2"
                      aria-label={t('onboarding.height')}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground">{t('profile.bmi')}</span>
                    <div
                      className="h-7 mt-0.5 flex items-center justify-center rounded-md border border-input bg-muted/25 text-sm font-semibold tabular-nums text-foreground"
                      aria-live="polite"
                      aria-label={t('profile.bmi')}
                    >
                      {bmi != null ? bmi : '—'}
                    </div>
                  </div>
                </div>
                {bmi != null && suggestedTargetWeight != null && (
                  <div className="mt-1.5 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5">
                    <p className="text-[10px] font-medium text-foreground">
                      {t('onboarding.suggestedTarget', { weight: suggestedTargetWeight })}
                      {bmiCategory && (
                        <span className="text-muted-foreground font-normal"> · {t(`onboarding.bmiCategory.${bmiCategory}`)}</span>
                      )}
                    </p>
                    {weightChange && weightChange.direction !== 'maintain' && (
                      <p className="text-[10px] text-primary mt-0.5">
                        {weightChange.direction === 'gain'
                          ? t('onboarding.weightGainHint', { amount: weightChange.absDelta })
                          : t('onboarding.weightLossHint', { amount: weightChange.absDelta })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-medium">{t('onboarding.primaryGoal')}</span>
                {suggestedGoal != null && !goalTouched && (
                  <span className="text-[10px] text-muted-foreground ml-1.5">
                    · {t('onboarding.goalSuggested', { goal: translateGoal(suggestedGoal) })}
                  </span>
                )}
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {GOAL_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors text-center',
                        goal === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => { setGoalTouched(true); setGoal(value) }}
                    >
                      {translateGoal(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium">Experience level</span>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {FITNESS_LEVELS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors text-center',
                        fitnessLevel === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => { setFitnessLevelTouched(true); setFitnessLevel(value) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium">Equipment</span>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {EQUIPMENT_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors text-center',
                        equipmentId === id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => setEquipmentId(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium">Workout days</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const active = workoutDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        {DAY_ABBREV[day]}
                      </button>
                    )
                  })}
                </div>
                {workoutDays.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    Select at least one day
                  </p>
                )}
              </div>
            </div>

            <Button
              className="w-full mt-3 h-8 text-sm"
              onClick={handleComplete}
              disabled={!name.trim() || workoutDays.length === 0}
            >
              {t('onboarding.getStarted')}
            </Button>
          </Card>
        </div>
      </div>

      <div
        className="relative shrink-0 h-[38vh] min-h-[200px] max-h-[320px] w-full pointer-events-none z-0"
        aria-hidden
      >
        <GymFloatingPattern />
      </div>
    </div>
  )
}

export default OnboardingPage
