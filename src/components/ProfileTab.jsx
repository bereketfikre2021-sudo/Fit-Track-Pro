import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User,
  Settings,
  Scale,
  Ruler,
  Award,
  Target,
  Edit2,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Zap,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { DateInput } from './ui/date-input'
import { Badge } from './ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { readAvatarFromFile } from '@/lib/avatarUpload'
import { calculateAgeFromBirthDate, calculateBmi, formatMemberSinceDate } from '@/lib/profileUtils'
import { FOCUS_AREAS } from '@/lib/profileOptions'
import {
  translateFocusArea,
  translateFitnessLevel,
  translateGoal,
} from '@/lib/i18nHelpers'

import BodyWeightTracker from './BodyWeightTracker'

const GOALS = [
  { value: 'strength', label: 'Strength', emoji: '💪' },
  { value: 'muscle', label: 'Muscle', emoji: '🏋️' },
  { value: 'fat', label: 'Fat loss', emoji: '🔥' },
  { value: 'endurance', label: 'Endurance', emoji: '🏃' },
]

const EQUIPMENT_OPTIONS = [
  { id: 'gym',         label: '🏋️ Full gym',         values: ['Gym', 'Barbell', 'Dumbbell', 'Machine', 'Cable'] },
  { id: 'freeweights', label: '🥇 Free weights',      values: ['Barbell', 'Dumbbell'] },
  { id: 'machines',    label: '⚙️ Machines & Cables', values: ['Machine', 'Cable'] },
  { id: 'bodyweight',  label: '🤸 Bodyweight only',   values: ['Bodyweight'] },
]

function equipmentToId(equipment = []) {
  if (!equipment.length || equipment.includes('Gym')) return 'gym'
  if (equipment.includes('Bodyweight') && equipment.length === 1) return 'bodyweight'
  if (equipment.some((e) => ['Machine', 'Cable'].includes(e)) && !equipment.some((e) => ['Barbell', 'Dumbbell'].includes(e))) return 'machines'
  if (equipment.some((e) => ['Barbell', 'Dumbbell'].includes(e)) && !equipment.some((e) => ['Machine', 'Cable'].includes(e))) return 'freeweights'
  return 'gym'
}

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

function EditActions({ onSave, onCancel }) {
  return (
    <>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onSave}>
        <Check className="h-3.5 w-3.5 text-green-500" />
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancel}>
        <X className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </>
  )
}

function MetricRow({ icon: Icon, label, value, onEdit, isEditing, children }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-all',
        onEdit && !isEditing && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        isEditing && 'ring-2 ring-primary border-primary/50'
      )}
      onClick={onEdit && !isEditing ? onEdit : undefined}
      role={onEdit && !isEditing ? 'button' : undefined}
      tabIndex={onEdit && !isEditing ? 0 : undefined}
      onKeyDown={onEdit && !isEditing ? (e) => { if (e.key === 'Enter' || e.key === ' ') onEdit() } : undefined}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1.5 ml-2">{children}</div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{value}</span>
          {onEdit && <Edit2 className="h-3 w-3 text-muted-foreground/50" />}
        </div>
      )}
    </div>
  )
}

function ProfileTab({ state, updateState }) {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState(state.profile)
  const [editingField, setEditingField] = useState(null)
  const avatarFileInputRef = useRef(null)

  useEffect(() => { setFormData(state.profile) }, [state.profile])

  const save = () => {
    updateState({ profile: formData })
    setEditingField(null)
    toast.success(t('profile.toastUpdated'))
  }

  const cancel = () => {
    setFormData(state.profile)
    setEditingField(null)
  }

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const dataUrl = await readAvatarFromFile(file)
    if (!dataUrl) return
    setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }))
    updateState({ profile: { ...state.profile, avatarUrl: dataUrl } })
    toast.success(t('profile.toastAvatar'))
    e.target.value = ''
  }

  const age = calculateAgeFromBirthDate(formData.birthDate)
  const fitnessLevel = formData.fitnessLevel || 'beginner'
  const goalMeta = GOALS.find((g) => g.value === formData.goal) || GOALS[1]
  const bmi = calculateBmi(formData.currentWeight, formData.height)
  const eqLabel = EQUIPMENT_OPTIONS.find((o) => o.id === equipmentToId(formData.equipment || []))?.label || '🏋️ Full gym'

  const selectClass = 'flex h-8 flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm'

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto space-y-3">

      {/* Hero card */}
      <Card className="overflow-hidden border-primary/20 shadow-md">
        <CardContent className="relative p-5 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent">
          <Link
            to="/profile/settings"
            className="absolute top-3 right-3 rounded-lg border border-border/80 bg-background/80 p-2 hover:bg-muted transition-colors"
            aria-label={t('profile.settingsAria')}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <button
                type="button"
                className="h-20 w-20 rounded-2xl ring-4 ring-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-lg hover:opacity-90 transition-opacity"
                onClick={() => avatarFileInputRef.current?.click()}
                aria-label={t('profile.changeAvatar')}
              >
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="" className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.src = ''; setFormData((prev) => ({ ...prev, avatarUrl: '' })) }}
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
              {editingField === 'name' ? (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 max-w-xs"
                    autoFocus
                  />
                  <EditActions onSave={save} onCancel={cancel} />
                </div>
              ) : (
                <button
                  type="button"
                  className="group flex items-center gap-2 justify-center sm:justify-start mx-auto sm:mx-0"
                  onClick={() => setEditingField('name')}
                >
                  <h1 className="text-2xl font-bold truncate">{formData.name || t('profile.yourProfile')}</h1>
                  <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('profile.planDetails')}</p>
              {formData.registrationDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('profile.memberSince', { date: formatMemberSinceDate(formData.registrationDate, i18n.language) })}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start mt-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  {goalMeta.emoji} {translateGoal(formData.goal)}
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

      {/* Body Metrics */}
      <AccordionCard
        icon={Scale}
        title={t('profile.bodyMetrics')}
        summary={[
          formData.currentWeight ? `${formData.currentWeight} kg` : null,
          formData.height ? `${formData.height} cm` : null,
          bmi ? `BMI ${bmi}` : null,
        ].filter(Boolean).join(' · ')}
      >
        <div className="space-y-2 pt-3">
          <MetricRow
            icon={Scale} label={t('profile.weight')}
            value={formData.currentWeight ? `${formData.currentWeight} kg` : '—'}
            onEdit={() => setEditingField('weight')} isEditing={editingField === 'weight'}
          >
            <Input type="number" step="0.1" value={formData.currentWeight}
              onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
              className="h-8 w-24" onClick={(e) => e.stopPropagation()} />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricRow>

          <MetricRow
            icon={Ruler} label={t('profile.height')}
            value={formData.height ? `${formData.height} cm` : '—'}
            onEdit={() => setEditingField('height')} isEditing={editingField === 'height'}
          >
            <Input type="number" step="0.1" value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className="h-8 w-24" onClick={(e) => e.stopPropagation()} />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricRow>

          <MetricRow
            icon={Target} label={t('profile.target')}
            value={formData.targetWeight ? `${formData.targetWeight} kg` : '—'}
            onEdit={() => setEditingField('target')} isEditing={editingField === 'target'}
          >
            <Input type="number" step="0.1" value={formData.targetWeight}
              onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
              className="h-8 w-24" onClick={(e) => e.stopPropagation()} />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricRow>

          <MetricRow icon={Award} label={t('profile.bmi')} value={bmi || '—'} />

          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            <MetricRow
              icon={User} label={t('profile.birthDate')}
              value={age ? t('profile.years', { age }) : t('profile.addBirthDate')}
              onEdit={() => setEditingField('age')} isEditing={editingField === 'age'}
            >
              <DateInput value={formData.birthDate || ''}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="h-8 flex-1" />
              <EditActions onSave={save} onCancel={cancel} />
            </MetricRow>

            <MetricRow
              icon={User} label={t('profile.gender')}
              value={formData.gender === 'male' ? t('common.male') : formData.gender === 'female' ? t('common.female') : '—'}
              onEdit={() => setEditingField('gender')} isEditing={editingField === 'gender'}
            >
              <select value={formData.gender || 'male'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className={selectClass}>
                <option value="male">{t('common.male')}</option>
                <option value="female">{t('common.female')}</option>
              </select>
              <EditActions onSave={save} onCancel={cancel} />
            </MetricRow>
          </div>
        </div>
      </AccordionCard>

      {/* Training Focus */}
      <AccordionCard
        icon={Target}
        title={t('profile.trainingFocus')}
        summary={`${goalMeta.emoji} ${translateGoal(formData.goal)} · ${translateFocusArea(formData.focusArea)}`}
      >
        <div className="space-y-4 pt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('profile.primaryGoal')}</p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g.value} type="button"
                  onClick={() => {
                    const next = { ...formData, goal: g.value }
                    setFormData(next)
                    updateState({ profile: next })
                    toast.success(t('profile.toastGoal'))
                  }}
                  className={cn(
                    'rounded-lg border p-2.5 text-left text-sm transition-all',
                    formData.goal === g.value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <span className="text-lg leading-none">{g.emoji}</span>
                  <span className="font-medium block mt-1">{translateGoal(g.value)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('profile.targetMuscles')}</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map((area) => (
                <button key={area.value} type="button"
                  onClick={() => {
                    const next = { ...formData, focusArea: area.value }
                    setFormData(next)
                    updateState({ profile: next })
                    toast.success(t('profile.toastFocus'))
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                    formData.focusArea === area.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {translateFocusArea(area.value)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AccordionCard>

      {/* Experience Level */}
      <AccordionCard
        icon={Zap}
        title={t('profile.experience')}
        summary={translateFitnessLevel(fitnessLevel)}
      >
        <div className="grid grid-cols-3 gap-2 pt-3">
          {['beginner', 'intermediate', 'advanced'].map((level) => (
            <button key={level} type="button"
              onClick={() => {
                const next = { ...formData, fitnessLevel: level }
                setFormData(next)
                updateState({ profile: next })
                toast.success(t('profile.toastUpdated'))
              }}
              className={cn(
                'rounded-lg border px-2 py-2.5 text-sm font-medium transition-all text-center',
                formData.fitnessLevel === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/40 text-muted-foreground'
              )}
            >
              {level === 'beginner' ? '🌱' : level === 'intermediate' ? '⚡' : '🔥'}{' '}
              {translateFitnessLevel(level)}
            </button>
          ))}
        </div>
      </AccordionCard>

      {/* Available Equipment */}
      <AccordionCard
        icon={Wrench}
        title="Available equipment"
        summary={eqLabel}
      >
        <div className="grid grid-cols-2 gap-2 pt-3">
          {EQUIPMENT_OPTIONS.map(({ id, label, values }) => {
            const selected = equipmentToId(formData.equipment || []) === id
            return (
              <button key={id} type="button"
                onClick={() => {
                  const updated = { ...formData, equipment: values }
                  setFormData(updated)
                  updateState({ profile: updated })
                }}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left',
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/40 text-muted-foreground'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </AccordionCard>

      {/* Body weight chart */}
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
