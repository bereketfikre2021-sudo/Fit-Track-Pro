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

import {
  calculateBmi,
  getBmiCategory,
  getWeightChangeInfo,
  suggestPrimaryGoal,
  suggestTargetWeightKg,
} from '../lib/profileUtils'

const GOAL_VALUES = ['strength', 'muscle', 'fat', 'endurance']
const GENDER_VALUES = ['male', 'female']
const EQUIPMENT_OPTIONS = [
  { value: 'Gym', label: '🏋️ Full gym' },
  { value: 'Dumbbell', label: '🪆 Dumbbells' },
  { value: 'Barbell', label: '🏋️ Barbell' },
  { value: 'Bodyweight', label: '🤸 Bodyweight only' },
  { value: 'Machine', label: '⚙️ Machines' },
  { value: 'Cable', label: '🔗 Cables' },
]

function OnboardingPage({ profile, onResume, onComplete }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canResume = !!profile?.name?.trim()
  const [name, setName] = useState('')
  const [gender, setGender] = useState('male')
  const [currentWeight, setCurrentWeight] = useState('')
  const [height, setHeight] = useState('')
  const [goal, setGoal] = useState('muscle')
  const [goalTouched, setGoalTouched] = useState(false)
  const [equipment, setEquipment] = useState(['Gym'])

  const toggleEquipment = (value) => {
    setEquipment((prev) =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter((v) => v !== value) : prev // keep at least one
        : [...prev, value]
    )
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
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result
        if (typeof text !== 'string') {
          throw new Error(i18n.t('app.readFileError'))
        }
        const imported = hydrateAppStateFromBackup(text)
        saveAppState(imported)
        toast.success(t('onboarding.toastImportSuccess'))
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
      equipment,
      fitnessLevel: 'beginner',
      workoutDays: [],
    })
    navigate('/')
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

          <Card className="w-full max-w-md p-4 md:p-5 bg-card border-border/50 shadow-lg shrink-0">
            <div className="space-y-3">
              <div>
                <label htmlFor="onboarding-name" className="text-sm font-medium">
                  {t('onboarding.yourName')}
                </label>
                <Input
                  id="onboarding-name"
                  placeholder={t('onboarding.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="h-8 mt-1 text-sm"
                />
              </div>

              <div>
                <span className="text-sm font-medium">{t('onboarding.gender')}</span>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {GENDER_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-2 py-2 text-[11px] font-medium transition-colors text-center',
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
                <p className="text-[11px] text-muted-foreground leading-snug mb-1.5">
                  {t('onboarding.bodyMetricsHint')}
                </p>
                <div className="grid grid-cols-3 gap-1.5 items-end">
                  <div className="min-w-0">
                    <label
                      htmlFor="onboarding-weight"
                      className="text-[10px] font-medium text-muted-foreground"
                    >
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
                      className="h-8 mt-0.5 text-sm px-2"
                      aria-label={t('onboarding.weight')}
                    />
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor="onboarding-height"
                      className="text-[10px] font-medium text-muted-foreground"
                    >
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
                      className="h-8 mt-0.5 text-sm px-2"
                      aria-label={t('onboarding.height')}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {t('profile.bmi')}
                    </span>
                    <div
                      className="h-8 mt-0.5 flex items-center justify-center rounded-md border border-input bg-muted/25 text-sm font-semibold tabular-nums text-foreground"
                      aria-live="polite"
                      aria-label={t('profile.bmi')}
                    >
                      {bmi != null ? bmi : '—'}
                    </div>
                  </div>
                </div>
                {bmi != null && suggestedTargetWeight != null && (
                  <div className="mt-2 rounded-md border border-primary/25 bg-primary/5 px-2.5 py-2">
                    <p className="text-[11px] font-medium text-foreground">
                      {t('onboarding.suggestedTarget', { weight: suggestedTargetWeight })}
                    </p>
                    {bmiCategory && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t(`onboarding.bmiCategory.${bmiCategory}`)}
                      </p>
                    )}
                    {weightChange && weightChange.direction !== 'maintain' && (
                      <p className="text-[10px] text-primary mt-0.5">
                        {weightChange.direction === 'gain'
                          ? t('onboarding.weightGainHint', { amount: weightChange.absDelta })
                          : t('onboarding.weightLossHint', { amount: weightChange.absDelta })}
                      </p>
                    )}
                    {weightChange?.direction === 'maintain' && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t('onboarding.weightMaintainHint')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <span className="text-sm font-medium">{t('onboarding.primaryGoal')}</span>
                {suggestedGoal != null && !goalTouched && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('onboarding.goalSuggested', { goal: translateGoal(suggestedGoal) })}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {GOAL_VALUES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-1 py-2 text-[11px] font-medium transition-colors',
                        goal === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => {
                        setGoalTouched(true)
                        setGoal(value)
                      }}
                    >
                      {translateGoal(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Available equipment</span>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">
                  Select all that apply — AI uses this to tailor exercises
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {EQUIPMENT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        'rounded-md border px-2 py-2 text-[11px] font-medium transition-colors text-left',
                        equipment.includes(value)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                      )}
                      onClick={() => toggleEquipment(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-4 h-9"
              onClick={handleComplete}
              disabled={!name.trim()}
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
