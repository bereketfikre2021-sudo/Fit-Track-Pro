import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/useAuth'
import { useNotifications } from '@/lib/useNotifications'
import { Bell, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'
import { useTranslation } from 'react-i18next'

// ── Relative time helper ──────────────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  const diffMs  = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr  = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)
  if (diffMin < 1)  return 'just now'
  if (diffHr  < 1)  return `${diffMin}m ago`
  if (diffDay < 1)  return `${diffHr}h ago`
  if (diffDay < 7)  return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Notification row ──────────────────────────────────────────────────────────
function NotificationRow({ notification }) {
  return (
    <div
      className={cn(
        'px-4 py-3 flex flex-col gap-1 transition-colors cursor-default',
        !notification.is_read
          ? 'bg-primary/5 border-l-2 border-primary'
          : 'hover:bg-muted/30'
      )}
    >
      <span className={cn('text-sm leading-snug', !notification.is_read ? 'font-semibold' : 'font-medium')}>
        {notification.title}
      </span>
      {notification.body && (
        <span className="text-xs text-muted-foreground line-clamp-2">{notification.body}</span>
      )}
      <div className="flex items-center gap-2 mt-0.5">
        {notification.category && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {notification.category.replace(/_/g, ' ')}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(notification.created_at)}</span>
      </div>
    </div>
  )
}

// ── NotificationBell ──────────────────────────────────────────────────────────
export default function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    isOpen,
    openPanel,
    closePanel,
    markAllRead,
  } = useNotifications()

  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closePanel])

  // Close on browser back button
  useEffect(() => {
    if (!isOpen) return
    const onPopState = () => closePanel()
    window.addEventListener('popstate', onPopState)
    // Push a dummy state so back button triggers popstate
    window.history.pushState({ notificationPanel: true }, '')
    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [isOpen, closePanel])

  // Always render the bell (even when not signed in — just show empty state)
  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        className="relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
        aria-label={t('nav.notifications', { defaultValue: 'Notifications' })}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={isOpen ? closePanel : openPanel}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-0.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Full-screen backdrop — closes on click anywhere outside panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closePanel}
          aria-hidden
        />
      )}

      {/* Notification popup rectangle */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.notifications', { defaultValue: 'Notifications' })}
          className={cn(
            // Base — rounded rectangle with shadow
            'absolute z-50 flex flex-col',
            'bg-background border border-border rounded-xl shadow-2xl',
            'overflow-hidden',
            // Desktop: anchored below the bell, right-aligned, fixed width
            'right-0 top-full mt-2 w-80 max-h-[420px]',
            // Mobile override: fixed centered at top of screen
            'max-sm:fixed max-sm:top-16 max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:max-h-[70vh]'
          )}
          // Prevent clicks inside from bubbling to backdrop
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-semibold">
              {t('nav.notifications', { defaultValue: 'Notifications' })}
            </span>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  {t('nav.markAllRead', { defaultValue: 'Mark all read' })}
                </button>
              )}
              <button
                onClick={closePanel}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {!user ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
                <Bell className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {t('nav.notificationsSignIn', { defaultValue: 'Sign in to see notifications' })}
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {t('nav.noNotifications', { defaultValue: 'No notifications yet' })}
                </p>
              </div>
            ) : (
              notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
            )}
          </div>

          {/* Footer — See all link */}
          {user && notifications.length > 0 && (
            <div className="border-t border-border flex-shrink-0">
              <button
                onClick={() => { closePanel(); navigate('/notifications') }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-primary hover:bg-muted/30 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('nav.seeAllNotifications', { defaultValue: 'See all notifications' })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
