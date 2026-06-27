import { Sparkles, Loader2, LayoutTemplate, Calendar, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { cn } from '@/lib/utils'
import { isGeminiConfigured } from '@/lib/gemini'

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
  const displayLabel = label ?? t('ai.defaultLabel')

  const handleClick = () => {
    if (loading || disabled) return
    if (!configured) {
      toast.error(t('ai.notConfigured'))
      return
    }
    onClick?.()
  }

  return (
    <Button
      type="button"
      size={size}
      className={cn((!configured && !loading) && 'opacity-90', className)}
      disabled={loading || disabled}
      onClick={handleClick}
      title={configured ? undefined : t('ai.notConfigured')}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
export function NewUserGetStartedCard({ aiLoading, onAiGenerate, setupMethod = null }) {
  const { t } = useTranslation()
  const configured = isGeminiConfigured()
  const showAi = setupMethod === null || setupMethod === 'ai'
  const showTemplate = setupMethod === null || setupMethod === 'template'
  const showManual = setupMethod === null || setupMethod === 'manual'

  const options = [
    showAi && (
      <button
        key="ai"
        type="button"
        disabled={aiLoading || !configured}
        onClick={configured ? onAiGenerate : () => toast.error(t('ai.notConfigured'))}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-all',
          'border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10',
          (aiLoading || !configured) && 'opacity-60 cursor-not-allowed'
        )}
        title={configured ? undefined : t('ai.notConfigured')}
      >
        {aiLoading ? (
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        ) : (
          <Sparkles className="h-7 w-7 text-primary" />
        )}
        <span className="text-sm font-semibold">
          {aiLoading ? t('ai.generating') : t('ai.generateAll')}
        </span>
        <span className="text-xs text-muted-foreground leading-snug">
          {t('ai.generateAllDesc')}
        </span>
      </button>
    ),
    showTemplate && (
      <Link
        key="template"
        to="/exercises?tab=templates"
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-border px-4 py-5 text-center transition-all hover:border-primary/60 hover:bg-muted/30"
      >
        <LayoutTemplate className="h-7 w-7 text-muted-foreground" />
        <span className="text-sm font-semibold">{t('ai.chooseTemplate')}</span>
        <span className="text-xs text-muted-foreground leading-snug">
          {t('ai.chooseTemplateDesc')}
        </span>
      </Link>
    ),
    showManual && (
      <Link
        key="manual"
        to="/exercises"
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-border px-4 py-5 text-center transition-all hover:border-primary/60 hover:bg-muted/30"
      >
        <Plus className="h-7 w-7 text-muted-foreground" />
        <span className="text-sm font-semibold">{t('ai.addManually')}</span>
        <span className="text-xs text-muted-foreground leading-snug">
          {t('ai.addManuallyDesc')}
        </span>
      </Link>
    ),
  ].filter(Boolean)

  if (options.length === 0) return null

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-6 px-4 space-y-5">
        <div className="text-center">
          <p className="text-lg font-semibold">{t('home.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {t('home.emptyDesc')}
          </p>
        </div>

        <div
          className={cn(
            'grid gap-3',
            options.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-3'
          )}
        >
          {options}
        </div>
      </CardContent>
    </Card>
  )
}

export default AiRecommendButton
