import { useState } from 'react'
import { Sparkles, Loader2, LayoutTemplate, Plus, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'
import { isGeminiConfigured } from '@/lib/gemini'
import { useSubscription } from '@/lib/useSubscription'
import PresetTemplatesSection from './PresetTemplatesSection'

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

  const handleClick = () => {
    if (loading || disabled) return
    if (!configured) {
      toast.error(t('ai.notConfigured'))
      return
    }
    if (!features.ai) {
      toast.error('AI coaching requires a Pro subscription or higher. Upgrade in Settings → Subscription.')
      return
    }
    onClick?.()
  }

  const isBlocked = !features.ai || (!configured && !loading)

  return (
    <Button
      type="button"
      size={size}
      className={cn(isBlocked && !loading && 'opacity-90', className)}
      disabled={loading || disabled}
      onClick={handleClick}
      title={!features.ai ? 'Upgrade to Pro to use AI coaching' : (!configured ? t('ai.notConfigured') : undefined)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : !features.ai ? (
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
 * Presents setup options filtered by the user's initial plan choice.
 */
export function NewUserGetStartedCard({ aiLoading, onAiGenerate, setupMethod = null, state, updateState }) {
  const { t } = useTranslation()
  const configured = isGeminiConfigured()
  const [showTemplates, setShowTemplates] = useState(false)

  const showAi = setupMethod === null || setupMethod === 'ai' || setupMethod === 'manual'
  const showTemplate = setupMethod === null || setupMethod === 'template' || setupMethod === 'manual'
  const showManual = setupMethod === null || setupMethod === 'manual'

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

        {/* Inline template browser */}
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
