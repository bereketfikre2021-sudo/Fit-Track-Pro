import { Download, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { usePwaInstall } from '@/lib/usePwaInstall'

function PwaInstallPrompt() {
  const { t } = useTranslation()
  const { visible, canInstall, dismiss, install } = usePwaInstall()

  if (!visible || !canInstall) return null

  return (
    <div
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      className={cn(
        'fixed left-4 right-4 z-[60] mx-auto max-w-md',
        'bottom-20 md:bottom-6',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}
    >
      <div className="rounded-xl border border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur-xl">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p id="pwa-install-title" className="font-semibold leading-tight">
              {t('pwaInstall.title')}
            </p>
            <p id="pwa-install-desc" className="mt-1 text-sm text-muted-foreground">
              {t('pwaInstall.description')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={install}>
                {t('pwaInstall.install')}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {t('pwaInstall.notNow')}
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PwaInstallPrompt
