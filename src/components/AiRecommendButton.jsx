import { Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { isGeminiConfigured } from '@/lib/gemini'

function AiRecommendButton({
  onClick,
  loading = false,
  label,
  className,
  size = 'sm',
}) {
  const { t } = useTranslation()
  const configured = isGeminiConfigured()
  const displayLabel = label ?? t('ai.defaultLabel')

  const handleClick = () => {
    if (loading) return
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
      className={cn(!configured && !loading && 'opacity-90', className)}
      disabled={loading}
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

export default AiRecommendButton
