import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2, LayoutTemplate, Plus } from 'lucide-react'
import { toast } from 'sonner'
import PageBackground from '../components/PageBackground'
import GymFloatingPattern from '../components/GymFloatingPattern'
import { Card, CardContent } from '../components/ui/card'
import { BACKGROUND_HOME } from '../lib/backgrounds'
import { cn } from '../lib/utils'
import { isGeminiConfigured } from '@/lib/gemini'
import { getAiToastKey } from '@/lib/aiErrors'
import { showImportWarnings } from '@/lib/importWarnings'
import { applyAiPlanSetup, applyTemplatePlanSetup } from '@/lib/planSetup'
import { translateGoal } from '@/lib/i18nHelpers'
import {
  getPresetTemplateById,
  getRecommendedWorkoutTemplateId,
} from '@/lib/presetTemplates'
import { calculateBmi, getBmiCategory, resolveEffectiveTrainingGoal } from '@/lib/profileUtils'
import { PRESET_MEAL_PLANS, getRecommendedMealPlanId } from '@/lib/presetMealPlans'

function resolveMealPresetId(bmiCategory, profileGoal) {
  const id = getRecommendedMealPlanId(bmiCategory, profileGoal)
  if (id) return id
  return profileGoal === 'fat' ? 'weight-loss' : 'weight-gain'
}

function PlanSetupPage({ state, updateState }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPhase, setAiPhase] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)

  const profile = state.profile || {}
  const goal = resolveEffectiveTrainingGoal(profile)
  const bmiCategory = getBmiCategory(calculateBmi(profile.currentWeight, profile.height))
  const workoutPreset = getPresetTemplateById(getRecommendedWorkoutTemplateId(profile))
  const mealPreset = PRESET_MEAL_PLANS.find(
    (p) => p.id === resolveMealPresetId(bmiCategory, goal)
  )
  const configured = isGeminiConfigured()

  const finishSetup = (path = '/') => {
    navigate(path)
  }

  const handleAi = async () => {
    if (!configured) {
      toast.error(t('ai.notConfigured'))
      return
    }
    setAiLoading(true)
    setAiPhase('exercises')
    try {
      const updates = await applyAiPlanSetup(state, {
        onPhase: (phase) => setAiPhase(phase),
      })
      flushSync(() => {
        updateState(updates)
      })
      showImportWarnings(updates.exerciseWarnings, { title: t('custom.aiNotesTitle') })
      toast.success(t('setup.aiSuccess'))
      finishSetup('/')
    } catch (err) {
      toast.error(t(getAiToastKey(err)))
    } finally {
      setAiLoading(false)
      setAiPhase(null)
    }
  }

  const handleTemplate = () => {
    setTemplateLoading(true)
    try {
      const updates = applyTemplatePlanSetup(state)
      flushSync(() => {
        updateState(updates)
      })
      toast.success(t('setup.templateSuccess'))
      finishSetup('/')
    } catch (err) {
      toast.error(err.message || t('setup.templateFail'))
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleManual = () => {
    flushSync(() => {
      updateState({ planSetupComplete: true, planSetupMethod: 'manual' })
    })
    finishSetup('/exercises')
  }

  const aiPhaseLabel =
    aiPhase === 'exercises'
      ? t('setup.phaseExercises')
      : aiPhase === 'meals'
        ? t('setup.phaseMeals')
        : aiPhase === 'shopping'
          ? t('setup.phaseShopping')
          : null

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
            <h1 className="text-2xl font-display font-extrabold tracking-tight">
              {t('setup.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {t('setup.subtitle', { goal: translateGoal(goal) })}
            </p>
          </div>

          <Card className="w-full max-w-lg border-primary/30 bg-card/95 shadow-lg shrink-0">
            <CardContent className="py-6 px-4 space-y-5">
              <p className="text-xs text-muted-foreground text-center">
                {t('setup.coversAll')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={aiLoading || templateLoading}
                  onClick={handleAi}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all',
                    'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
                    (aiLoading || templateLoading || !configured) && 'opacity-60 cursor-not-allowed'
                  )}
                  title={configured ? undefined : t('ai.notConfigured')}
                >
                  {aiLoading ? (
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  ) : (
                    <Sparkles className="h-7 w-7 text-primary" />
                  )}
                  <span className="text-sm font-semibold">
                    {aiLoading ? aiPhaseLabel || t('ai.generating') : t('setup.aiTitle')}
                  </span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {t('setup.aiDesc')}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={aiLoading || templateLoading}
                  onClick={handleTemplate}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 border-border px-4 py-5 text-center transition-all',
                    'hover:border-primary/60 hover:bg-muted/30',
                    (aiLoading || templateLoading) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {templateLoading ? (
                    <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
                  ) : (
                    <LayoutTemplate className="h-7 w-7 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold">{t('setup.templateTitle')}</span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {workoutPreset && mealPreset
                      ? t('setup.templateDesc', {
                          workout: workoutPreset.name,
                          meal: mealPreset.name,
                        })
                      : t('setup.templateDescGeneric')}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={aiLoading || templateLoading}
                  onClick={handleManual}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 border-border px-4 py-5 text-center transition-all',
                    'hover:border-primary/60 hover:bg-muted/30',
                    (aiLoading || templateLoading) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Plus className="h-7 w-7 text-muted-foreground" />
                  <span className="text-sm font-semibold">{t('setup.manualTitle')}</span>
                  <span className="text-xs text-muted-foreground leading-snug">
                    {t('setup.manualDesc')}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className="relative shrink-0 h-[28vh] min-h-[160px] max-h-[280px] w-full pointer-events-none z-0"
        aria-hidden
      >
        <GymFloatingPattern />
      </div>
    </div>
  )
}

export default PlanSetupPage
