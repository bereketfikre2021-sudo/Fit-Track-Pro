import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

function CopyrightBadge({ className }) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {t('copyright', { year })}
    </p>
  )
}

export default CopyrightBadge
