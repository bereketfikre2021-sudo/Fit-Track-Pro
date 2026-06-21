import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User,
  Settings,
  Award,
  Target,
  Scale,
  Ruler,
  Edit2,
  Check,
  X,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
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

const BodyWeightTracker = lazy(() => import('./BodyWeightTracker'))

const GOALS = [
  { value: 'strength', label: 'Strength', emoji: '💪' },
  { value: 'muscle', label: 'Muscle', emoji: '🏋️' },
  { value: 'fat', label: 'Fat loss', emoji: '🔥' },
  { value: 'endurance', label: 'Endurance', emoji: '🏃' },
]

const LEVEL_STYLES = {
  beginner: 'text-blue-500',
  intermediate: 'text-amber-500',
  advanced: 'text-primary',
}

function MetricTile({ icon: Icon, label, value, onEdit, isEditing, children }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-muted/20 p-3 transition-all',
        onEdit && !isEditing && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        isEditing && 'ring-2 ring-primary border-primary/50'
      )}
      onClick={onEdit && !isEditing ? onEdit : undefined}
      onKeyDown={
        onEdit && !isEditing
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onEdit()
            }
          : undefined
      }
      role={onEdit && !isEditing ? 'button' : undefined}
      tabIndex={onEdit && !isEditing ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {onEdit && !isEditing && <Edit2 className="h-3 w-3 text-muted-foreground/60" />}
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1.5 mt-1">{children}</div>
      ) : (
        <p className="text-lg font-semibold">{value}</p>
      )}
    </div>
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

function ProfileTab({ state, updateState }) {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState(state.profile)
  const [editingField, setEditingField] = useState(null)
  const avatarFileInputRef = useRef(null)

  useEffect(() => {
    setFormData(state.profile)
  }, [state.profile])

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

  const selectClass =
    'flex h-8 flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1 text-sm'

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-2xl mx-auto space-y-5">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 shadow-md">
        <div className="h-20 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
        <CardContent className="relative pt-0 pb-5 px-5">
          <Link
            to="/profile/settings"
            className="absolute top-3 right-3 rounded-lg border border-border/80 bg-background/80 p-2 hover:bg-muted transition-colors"
            aria-label={t('profile.settingsAria')}
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <button
                type="button"
                className="h-20 w-20 rounded-2xl ring-4 ring-background bg-primary/10 flex items-center justify-center overflow-hidden shadow-lg hover:opacity-90 transition-opacity"
                onClick={() => avatarFileInputRef.current?.click()}
                aria-label={t('profile.changeAvatar')}
              >
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = ''
                      setFormData((prev) => ({ ...prev, avatarUrl: '' }))
                    }}
                  />
                ) : (
                  <User className="h-9 w-9 text-primary" />
                )}
              </button>
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
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
                  <h1 className="text-2xl font-bold truncate">
                    {formData.name || t('profile.yourProfile')}
                  </h1>
                  <Edit2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('profile.planDetails')}</p>
              {formData.registrationDate && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('profile.memberSince', {
                    date: formatMemberSinceDate(formData.registrationDate, i18n.language),
                  })}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start mt-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  {goalMeta.emoji} {translateGoal(formData.goal)}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal border-primary/30">
                  {translateFocusArea(formData.focusArea)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs font-normal', LEVEL_STYLES[fitnessLevel])}
                >
                  {translateFitnessLevel(fitnessLevel)}
                </Badge>
              </div>
              <Link
                to="/report"
                className="inline-block text-xs text-primary hover:underline mt-2"
              >
                {t('profile.statsLink')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {t('profile.bodyMetrics')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 pt-0">
          <MetricTile
            icon={Scale}
            label={t('profile.weight')}
            value={formData.currentWeight ? `${formData.currentWeight} kg` : '—'}
            onEdit={() => setEditingField('weight')}
            isEditing={editingField === 'weight'}
          >
            <Input
              type="number"
              step="0.1"
              value={formData.currentWeight}
              onChange={(e) => setFormData({ ...formData, currentWeight: e.target.value })}
              className="h-8 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricTile>

          <MetricTile
            icon={Ruler}
            label={t('profile.height')}
            value={formData.height ? `${formData.height} cm` : '—'}
            onEdit={() => setEditingField('height')}
            isEditing={editingField === 'height'}
          >
            <Input
              type="number"
              step="0.1"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className="h-8 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricTile>

          <MetricTile
            icon={Target}
            label={t('profile.target')}
            value={formData.targetWeight ? `${formData.targetWeight} kg` : '—'}
            onEdit={() => setEditingField('target')}
            isEditing={editingField === 'target'}
          >
            <Input
              type="number"
              step="0.1"
              value={formData.targetWeight}
              onChange={(e) => setFormData({ ...formData, targetWeight: e.target.value })}
              className="h-8 flex-1"
              onClick={(e) => e.stopPropagation()}
            />
            <EditActions onSave={save} onCancel={cancel} />
          </MetricTile>

          <MetricTile icon={Award} label={t('profile.bmi')} value={bmi || '—'} />
        </CardContent>
      </Card>

      {/* Goals & focus */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('profile.trainingFocus')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('profile.primaryGoal')}</p>
            {editingField === 'goal' ? (
              <div className="flex items-center gap-2">
                <select
                  value={formData.goal || 'muscle'}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className={cn(selectClass, 'max-w-xs')}
                >
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {translateGoal(g.value)}
                    </option>
                  ))}
                </select>
                <EditActions onSave={save} onCancel={cancel} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
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
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('profile.targetMuscles')}</p>
            {editingField === 'focus' ? (
              <div className="flex items-center gap-2">
                <select
                  value={formData.focusArea || 'full-body'}
                  onChange={(e) => setFormData({ ...formData, focusArea: e.target.value })}
                  className={selectClass}
                >
                  {FOCUS_AREAS.map((area) => (
                    <option key={area.value} value={area.value}>
                      {translateFocusArea(area.value)}
                    </option>
                  ))}
                </select>
                <EditActions onSave={save} onCancel={cancel} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.value}
                    type="button"
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
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <div>
              <p className="text-xs text-muted-foreground">{t('profile.experience')}</p>
              {editingField === 'level' ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={formData.fitnessLevel || 'beginner'}
                    onChange={(e) =>
                      setFormData({ ...formData, fitnessLevel: e.target.value })
                    }
                    className={selectClass}
                  >
                    <option value="beginner">{translateFitnessLevel('beginner')}</option>
                    <option value="intermediate">{translateFitnessLevel('intermediate')}</option>
                    <option value="advanced">{translateFitnessLevel('advanced')}</option>
                  </select>
                  <EditActions onSave={save} onCancel={cancel} />
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'text-sm font-semibold mt-0.5 flex items-center gap-1.5 group',
                    LEVEL_STYLES[fitnessLevel]
                  )}
                  onClick={() => setEditingField('level')}
                >
                  {translateFitnessLevel(fitnessLevel)}
                  <Edit2 className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('profile.aboutYou')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('profile.birthDate')}</p>
              {editingField === 'age' ? (
                <div className="flex items-center gap-1">
                  <DateInput
                    value={formData.birthDate || ''}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="h-8 flex-1"
                  />
                  <EditActions onSave={save} onCancel={cancel} />
                </div>
              ) : (
                <button
                  type="button"
                  className="text-sm font-semibold flex items-center gap-1 group w-full text-left"
                  onClick={() => setEditingField('age')}
                >
                  {age ? t('profile.years', { age }) : t('profile.addBirthDate')}
                  <Edit2 className="h-3 w-3 opacity-50 group-hover:opacity-100 ml-auto" />
                </button>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('profile.gender')}</p>
              {editingField === 'gender' ? (
                <div className="flex items-center gap-1">
                  <select
                    value={formData.gender || 'male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={selectClass}
                  >
                    <option value="male">{t('common.male')}</option>
                    <option value="female">{t('common.female')}</option>
                  </select>
                  <EditActions onSave={save} onCancel={cancel} />
                </div>
              ) : (
                <button
                  type="button"
                  className="text-sm font-semibold flex items-center gap-1 group w-full text-left capitalize"
                  onClick={() => setEditingField('gender')}
                >
                  {formData.gender === 'male'
                    ? t('common.male')
                    : formData.gender === 'female'
                      ? t('common.female')
                      : formData.gender || '—'}
                  <Edit2 className="h-3 w-3 opacity-50 group-hover:opacity-100 ml-auto" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{t('profile.loadingChart')}</CardContent>
          </Card>
        }
      >
        <BodyWeightTracker state={state} updateState={updateState} />
      </Suspense>
    </div>
  )
}

export default ProfileTab
