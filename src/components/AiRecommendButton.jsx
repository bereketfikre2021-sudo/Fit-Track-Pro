import { useState } from 'react'
import { Sparkles, Loader2, LayoutTemplate, Plus, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'
import { isGeminiConfigured, hasUserOwnApiKey } from '@/lib/gemini'
import { useSubscription } from '@/lib/useSubscription'
import PresetTemplatesSection from './PresetTemplatesSection'

/**
 * AI access logic:
 *   - User has their own Gemini API key → always allowed (their quota, not ours)
 *   - User has an active Pro/Elite/Team subscription → allowed up to plan limit
 *   - Free plan / no subscription + no own key → blocked, show upgrade prompt
 */
function canAccessAi(features) {
  // Own key bypasses subscription gate entirely
  if (hasUserOwnApiKey()) return true
  return features.ai === true
}

function AiRecommendButton({
  onClick,
  loading = false,
  disabled = false,
  label,
  className,
  size = 'sm',
}) {
  const { t } = useTranslation()
  const configured = isGeminiConfigured()
  const { features } = useSubscription()
  const displayLabel = label ?? t('ai.defaultLabel')

  // Effective AI access: own key OR paid plan
  const aiAllowed = canAccessAi(features)

  const handleClick = () => {
    if (loading || disabled) return
    if (!configured) {
      toast.error(t('ai.notConfigured'))
      return
    }
    if (!aiAllowed) {
      toast.error('AI coaching requires a Pro subscription or your own Gemini API key. Upgrade in Settings → Subscription.')
      return
    }
    onClick?.()
  }

  const isBlocked = !aiAllowed || (!configured && !loading)
  const blockTitle = !aiAllowed
    ? 'Upgrade to Pro or add your own Gemini API key in Settings → Advanced'
    : (!configured ? t('ai.notConfigured') : undefined)

  return (
    <Button
      type="button"
      size={size}
      className={cn(isBlocked && !loading && 'opacity-90', className)}
      disabled={loading || disabled}
      onClick={handleClick}
      title={blockTitle}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : !aiAllowed ? (
        <Lock className="h-4 w-4 mr-2" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {loading ? t('ai.generating') : displayLabel}
    </Button>
  )
}

/**
 * Unified "Get Started" card shown to new users with no workout days.
 */
export function NewUserGetStartedCard({ aiLoading, onAiGenerate, setupMethod = null, state, updateState }) {
  const { t } = useTranslation()
  const configured = isGeminiConfigured()
  const [showTemplates, setShowTemplates] = useState(false)

  const showAi       = setupMethod === null || setupMethod === 'ai'       || setupMethod === 'manual'
  const showTemplate = setupMethod === null || setupMethod === 'template' || setupMethod === 'manual'
  const showManual   = setupMethod === null || setupMethod === 'manual'

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-5 space-y-4">
        <div>
          <p className="font-medium">{t('home.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('home.emptyDesc')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showAi && (
            <Button
              type="button"
              size="sm"
              disabled={aiLoading || !configured}
              onClick={configured ? onAiGenerate : () => toast.error(t('ai.notConfigured'))}
              title={configured ? undefined : t('ai.notConfigured')}
            >
              {aiLoading
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-2" />}
              {aiLoading ? t('ai.generating') : t('ai.exerciseOnlyLabel')}
            </Button>
          )}

          {showTemplate && (
            <Button
              type="button"
              variant={showTemplates ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTemplates((v) => !v)}
            >
              <LayoutTemplate className="h-4 w-4 mr-2" />
              {t('ai.chooseTemplate')}
              {showTemplates
                ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" />
                : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
            </Button>
          )}

          {showManual && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/exercises">
                <Plus className="h-4 w-4 mr-2" />
                {t('ai.addManually')}
              </Link>
            </Button>
          )}
        </div>

        {showTemplates && showTemplate && state && updateState && (
          <div className="pt-1 border-t border-border/60">
            <PresetTemplatesSection state={state} updateState={updateState} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AiRecommendButton
