import { useAuth } from '@/lib/useAuth'
import { useNotifications } from '@/lib/useNotifications'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'

// ── Relative time helper ─────────────────────────────────────────────────────

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

// ── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({ notification }) {
  return (
    <div
      className={cn(
        'px-4 py-3 flex flex-col gap-1 hover:bg-muted/30 transition-colors cursor-default',
        !notification.is_read && 'bg-primary/5 border-l-2 border-primary'
      )}
    >
      <span
        className={cn(
          'text-sm leading-snug',
          !notification.is_read ? 'font-semibold' : 'font-medium'
        )}
      >
        {notification.title}
      </span>

      {notification.body && (
        <span className="text-xs text-muted-foreground line-clamp-2">
          {notification.body}
        </span>
      )}

      <div className="flex items-center gap-2 mt-0.5">
        {notification.category && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {notification.category.replace(/_/g, ' ')}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(notification.created_at)}
        </span>
      </div>
    </div>
  )
}

// ── NotificationBell ─────────────────────────────────────────────────────────

export default function NotificationBell() {
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

  if (!user) return null

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        className="relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
        aria-label="Notifications"
        onClick={openPanel}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-0.5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop — closes panel on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={closePanel}
          aria-hidden
        />
      )}

      {/* Notification panel */}
      {isOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl md:absolute md:bottom-auto md:left-auto md:right-0 md:top-full md:mt-2 md:w-80 md:max-h-96 md:rounded-xl md:border md:shadow-lg">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <span className="text-sm font-semibold">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Panel body */}
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
