import { Dumbbell, User, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NotificationBell from '../components/NotificationBell'
import MobileNav from '../components/MobileNav'
import DesktopNav from '../components/DesktopNav'
import PageTopBanner from '../components/PageTopBanner'
import PageBackground from '../components/PageBackground'
import OfflineIndicator from '../components/OfflineIndicator'
import { getPageBackground, getPageTopBanner } from '../lib/backgrounds'
import { cn } from '../lib/utils'

function DashboardLayout({ state, updateState, children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const profile   = state.profile
  const name      = profile.name || t('common.athlete')
  const avatarUrl = profile.avatarUrl || null

  const pageBackground = getPageBackground(location.pathname)
  const topBannerSrc   = getPageTopBanner(location.pathname)

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
        {/* ── Top header ───────────────────────────────────────────────────── */}
        <header
          className={cn(
            'sticky top-0 z-40 border-b border-border backdrop-blur',
            'supports-[backdrop-filter]:bg-background/80',
            pageBackground || topBannerSrc ? 'bg-background/70' : 'bg-background/95'
          )}
        >
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            {/* Logo + wordmark */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Dumbbell className="h-5 w-5 text-primary-foreground" aria-hidden />
              </div>
              <div>
                <p className="text-base font-bold leading-tight">{t('layout.appName')}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {t('layout.welcomeBack', { name })}
                </p>
              </div>
            </Link>

            {/* Right side — quick actions */}
            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <NotificationBell />

              {/* Settings shortcut */}
              <Link
                to="/profile/settings"
                aria-label="Settings"
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center transition-colors',
                  'hover:bg-muted',
                  location.pathname.includes('settings')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Settings className="h-[18px] w-[18px]" aria-hidden />
              </Link>

              {/* Profile / avatar shortcut */}
              <Link
                to="/profile"
                aria-label="Profile"
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center overflow-hidden transition-colors',
                  'ring-2 ring-border hover:ring-primary/50',
                  location.pathname.startsWith('/profile') && !location.pathname.includes('settings')
                    ? 'ring-primary'
                    : 'ring-border'
                )}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/15 flex items-center justify-center">
                    <User className="h-[18px] w-[18px] text-primary" aria-hidden />
                  </div>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* ── Desktop nav ──────────────────────────────────────────────────── */}
        <DesktopNav currentPath={location.pathname} state={state} />

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <main className="min-h-[calc(100vh-8rem)] transition-all duration-300">
          {topBannerSrc && <PageTopBanner src={topBannerSrc} className="-mt-px" />}
          {children}
        </main>

        {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
        <MobileNav currentPath={location.pathname} state={state} />
      </div>

      {/* Offline / syncing status indicator */}
      <OfflineIndicator />
    </div>
  )
}

export default DashboardLayout
