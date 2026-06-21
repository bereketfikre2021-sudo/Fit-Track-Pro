import { Dumbbell } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MobileNav from '../components/MobileNav'
import DesktopNav from '../components/DesktopNav'
import PageTopBanner from '../components/PageTopBanner'
import PageBackground from '../components/PageBackground'
import { getPageBackground, getPageTopBanner } from '../lib/backgrounds'
import { cn } from '../lib/utils'

function DashboardLayout({ state, updateState, children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const name = state.profile.name || t('common.athlete')
  const pageBackground = getPageBackground(location.pathname)
  const topBannerSrc = getPageTopBanner(location.pathname)

  return (
    <div
      className={cn(
        'min-h-screen text-foreground relative',
        !pageBackground && !topBannerSrc && 'bg-background'
      )}
    >
      {pageBackground && (
        <PageBackground
          src={pageBackground.src}
          overlayClassName={pageBackground.overlay}
          imageClassName={pageBackground.imageClassName}
        />
      )}

      <div className="relative z-10">
        <header
          className={cn(
            'sticky top-0 z-40 border-b border-border backdrop-blur supports-[backdrop-filter]:bg-background/80',
            pageBackground || topBannerSrc ? 'bg-background/70' : 'bg-background/95'
          )}
        >
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{t('layout.appName')}</h1>
                <p className="text-xs text-muted-foreground">{t('layout.welcomeBack', { name })}</p>
              </div>
            </Link>
          </div>
        </header>

        <DesktopNav currentPath={location.pathname} state={state} />

        <main className="min-h-[calc(100vh-8rem)] transition-all duration-300">
          {topBannerSrc && <PageTopBanner src={topBannerSrc} className="-mt-px" />}
          {children}
        </main>

        <MobileNav currentPath={location.pathname} state={state} />
      </div>
    </div>
  )
}

export default DashboardLayout
