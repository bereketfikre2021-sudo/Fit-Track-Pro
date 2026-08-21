import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User,
  Scale,
  Ruler,
  Award,
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Zap,
  Wrench,
  Info,
  Edit2,
  Check,
  X,
  Dumbbell,
  Flame,
  Activity,
  TrendingUp,
  Settings,
  CreditCard,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { readAvatarFromFile } from '@/lib/avatarUpload'
import { calculateAgeFromBirthDate, calculateBmi, formatMemberSinceDate, resolveEffectiveFitnessLevel } from '@/lib/profileUtils'
import {
  translateFitnessLevel,
  translateGoal,
} from '@/lib/i18nHelpers'
import { EQUIPMENT_OPTIONS, equipmentToId } from '@/lib/profileOptions'
import { DateInput } from './ui/date-input'
import BodyWeightTracker from './BodyWeightTracker'

const GOALS = [
  { value: 'strength',  label: 'Strength',  icon: Dumbbell },
  { value: 'muscle',    label: 'Muscle',    icon: TrendingUp },
  { value: 'fat',       label: 'Fat loss',  icon: Flame },
  { value: 'endurance', label: 'Endurance', icon: Activity },
]

const LEVEL_STYLES = {
  beginner: 'text-blue-500',
  intermediate: 'text-amber-500',
  advanced: 'text-primary',
}

function AccordionCard({ icon: Icon, title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            {!open && summary && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{summary}</p>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4">
          {children}
        </div>
      )}
    </Card>
  )
}

/** Read-only metric row — no editing, no click handler */
function MetricRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  )
}

function ProfileTab({ state, updateState }) {
  const { t, i18n } = useTranslation()
  const profile = state.profile
  const avatarFileInputRef = useRef(null)
  const [editingBirthDate, setEditingBirthDate] = useState(false)
  const [birthDateDraft, setBirthDateDraft] = useState(profile.birthDate || '')

  const saveBirthDate = () => {
    updateState({ profile: { ...profile, birthDate: birthDateDraft } })
    setEditingBirthDate(false)
    toast.success(t('profile.toastUpdated'))
  }

  const cancelBirthDate = () => {
    setBirthDateDraft(profile.birthDate || '')
    setEditingBirthDate(false)
  }

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const dataUrl = await readAvatarFromFile(file)
    if (!dataUrl) return
    updateState({ profile: { ...profile, avatarUrl: dataUrl } })
    toast.success(t('profile.toastAvatar'))
    e.target.value = ''
  }

  const age = calculateAgeFromBirthDate(profile.birthDate)
  const fitnessLevel = resolveEffectiveFitnessLevel(profile)
  const experienceHint = profile.fitnessLevelManual
    ? t('profile.experienceChosenAtSignup')
    : t('profile.experienceAutoDetected')
  const goalMeta = GOALS.find((g) => g.value === profile.goal) || GOALS[1]
  const bmi = calculateBmi(profile.currentWeight, profile.height)
  const eqLabel = EQUIPMENT_OPTIONS.find((o) => o.id === equipmentToId(profile.equipment || []))?.label || 'Full gym'

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto space-y-3">

      {/* Hero card */}
      <Card className="overflow-hidden border-primary/20 shadow-md">
        <CardContent className="relative p-5 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <button
                type="button"
                className="h-20 w-20 rounded-2xl ring-4 ring-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-lg hover:opacity-90 transition-opacity"
                onClick={() => avatarFileInputRef.current?.click()}
                aria-label={t('profile.changeAvatar')}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.src = ''; updateState({ profile: { ...profile, avatarUrl: '' } }) }}
                  />
                ) : (
                  <User className="h-9 w-9 text-primary" />
                )}
              </button>
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0 pb-1">
              <h1 className="text-2xl font-bold truncate">{profile.name || t('profile.yourProfile')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('profile.planDetails')}</p>
              {profile.registrationDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('profile.memberSince', { date: formatMemberSinceDate(profile.registrationDate, i18n.language) })}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start mt-2">
                <Badge variant="secondary" className="text-xs font-normal flex items-center gap-1">
                  {goalMeta.icon && <goalMeta.icon className="h-3 w-3" />}
                  {translateGoal(profile.goal)}
                </Badge>
                <Badge variant="outline" className={cn('text-xs font-normal', LEVEL_STYLES[fitnessLevel])}>
                  {translateFitnessLevel(fitnessLevel)}
                </Badge>
              </div>
              <Link to="/report" className="inline-block text-xs text-primary hover:underline mt-2">
                {t('profile.statsLink')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings shortcut */}
      <Link to="/profile/settings">
        <Card>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors rounded-xl">
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold">{t('settings.title')}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </Link>

      {/* Body Metrics — read-only, auto-updated from body weight log */}
      <AccordionCard
        icon={Scale}
        title={t('profile.bodyMetrics')}
        summary={[
          profile.currentWeight ? `${profile.currentWeight} kg` : null,
          profile.height ? `${profile.height} cm` : null,
          bmi ? `BMI ${bmi}` : null,
        ].filter(Boolean).join(' · ')}
      >
        <div className="space-y-2 pt-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 py-2 mb-1">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {t('profile.metricsReadOnlyHint', { defaultValue: 'Weight updates automatically when you log body weight below.' })}
            </p>
          </div>

          <MetricRow
            icon={Scale}
            label={t('profile.weight')}
            value={profile.currentWeight ? `${profile.currentWeight} kg` : '—'}
          />

          <MetricRow
            icon={Ruler}
            label={t('profile.height')}
            value={profile.height ? `${profile.height} cm` : '—'}
          />

          <MetricRow
            icon={Target}
            label={t('profile.target')}
            value={profile.targetWeight ? `${profile.targetWeight} kg` : '—'}
          />

          <MetricRow
            icon={Award}
            label={t('profile.bmi')}
            value={bmi || '—'}
          />

          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {/* Birth date — editable (not asked in onboarding) */}
            <div
              className={cn(
                'rounded-lg border border-border bg-muted/20 px-3 transition-all',
                !editingBirthDate && 'py-2.5 cursor-pointer hover:border-primary/40 hover:bg-primary/5',
                editingBirthDate && 'py-2.5 ring-2 ring-primary border-primary/50'
              )}
              onClick={!editingBirthDate ? () => { setBirthDateDraft(profile.birthDate || ''); setEditingBirthDate(true) } : undefined}
              role={!editingBirthDate ? 'button' : undefined}
              tabIndex={!editingBirthDate ? 0 : undefined}
              onKeyDown={!editingBirthDate ? (e) => { if (e.key === 'Enter' || e.key === ' ') { setBirthDateDraft(profile.birthDate || ''); setEditingBirthDate(true) } } : undefined}
            >
              {/* Label row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('profile.birthDate')}</span>
                </div>
                {!editingBirthDate && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">
                      {age ? t('profile.years', { age }) : t('profile.addBirthDate')}
                    </span>
                    <Edit2 className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Editing state — full-width dropdowns below label */}
              {editingBirthDate && (
                <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <DateInput
                    value={birthDateDraft}
                    onChange={(e) => setBirthDateDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="flex-1 h-8" onClick={saveBirthDate}>
                      <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                      {t('common.save')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="flex-1 h-8" onClick={cancelBirthDate}>
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <MetricRow
              icon={User}
              label={t('profile.gender')}
              value={profile.gender === 'male' ? t('common.male') : profile.gender === 'female' ? t('common.female') : '—'}
            />
          </div>
        </div>
      </AccordionCard>

      {/* Training Focus — read-only, set at onboarding */}
      <AccordionCard
        icon={Target}
        title={t('profile.trainingFocus')}
        summary={`${goalMeta.emoji} ${translateGoal(profile.goal)}`}
      >
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-semibold flex items-center gap-2">
              {goalMeta.icon && <goalMeta.icon className="h-4 w-4 text-primary" />}
              {translateGoal(profile.goal)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 py-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {t('profile.goalSetAtOnboarding', { defaultValue: 'Set during onboarding. Contact support to change.' })}
            </p>
          </div>
        </div>
      </AccordionCard>

      {/* Experience Level — read-only, set at onboarding */}
      <AccordionCard
        icon={Zap}
        title={t('profile.experience')}
        summary={translateFitnessLevel(fitnessLevel)}
      >
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className={cn('text-sm font-semibold flex items-center gap-2', LEVEL_STYLES[fitnessLevel])}>
              {fitnessLevel === 'beginner'
                ? <Zap className="h-4 w-4" />
                : fitnessLevel === 'intermediate'
                  ? <TrendingUp className="h-4 w-4" />
                  : <Flame className="h-4 w-4" />}
              {translateFitnessLevel(fitnessLevel)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">{experienceHint}</p>
        </div>
      </AccordionCard>

      {/* Available Equipment — read-only, set at onboarding */}
      <AccordionCard
        icon={Wrench}
        title={t('profile.equipment')}
        summary={eqLabel}
      >
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-semibold text-primary">
              {eqLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 py-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              {t('profile.equipmentSetAtOnboarding', { defaultValue: 'Set during onboarding. Contact support to change.' })}
            </p>
          </div>
        </div>
      </AccordionCard>

      {/* Body weight log — fully interactive */}
      <AccordionCard
        icon={Scale}
        title={t('bodyWeight.title')}
        summary={
          state.bodyLogs?.length
            ? `Latest: ${[...state.bodyLogs].sort((a, b) => b.date.localeCompare(a.date))[0]?.weightKg} kg`
            : t('bodyWeight.subtitle')
        }
      >
        <div className="pt-3">
          <BodyWeightTracker state={state} updateState={updateState} />
        </div>
      </AccordionCard>
    </div>
  )
}

export default ProfileTab
