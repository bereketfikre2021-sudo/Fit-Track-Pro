/**
 * NotificationsPage.jsx
 * Full notification history for the signed-in user.
 * Route: /notifications
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Bell, ChevronLeft, CheckCheck, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS = {
  workout_reminder:      'Workout',
  meal_reminder:         'Meal',
  water_reminder:        'Water',
  subscription_reminder: 'Subscription',
  announcement:          'Announcement',
  promotion:             'Promo',
  achievement:           'Achievement',
  system:                'System',
  payment_approved:      'Payment',
  payment_rejected:      'Payment',
  payment_submitted:     'Payment',
  subscription_expired:  'Subscription',
  subscription_expiring: 'Subscription',
  general:               'General',
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (h < 1) return `${m}m ago`
  if (d < 1) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric' })
}

function typeColor(type) {
  if (type?.includes('approved') || type?.includes('achievement')) return 'bg-emerald-500/15 text-emerald-400'
  if (type?.includes('rejected') || type?.includes('expired'))     return 'bg-red-500/15 text-red-400'
  if (type?.includes('expiring') || type?.includes('reminder'))    return 'bg-amber-500/15 text-amber-400'
  if (type?.includes('payment') || type?.includes('subscription')) return 'bg-primary/15 text-primary'
  return 'bg-muted text-muted-foreground'
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async (uid) => {
    if (!uid) return
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('id, title, body, type, is_read, created_at, action_url')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(100)
      if (err) throw err
      setNotifications(data ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) load(uid)
      else setLoading(false)
    })
  }, [load])

  const markAllRead = async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('All marked as read')
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const deleteNotif = async (id) => {
    setDeleting(id)
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
    toast.success('Notification deleted')
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold">Notifications</h1>
            {unread > 0 && (
              <span className="flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {unread}
              </span>
            )}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => load(userId)} className="text-sm text-primary hover:underline">Try again</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <p className="text-base font-semibold">No notifications yet</p>
            <p className="text-sm text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markRead(n.id) }}
              className={cn(
                'relative rounded-xl border bg-card p-4 flex items-start gap-3 transition-colors',
                !n.is_read
                  ? 'border-primary/30 bg-primary/5 cursor-pointer'
                  : 'border-border hover:bg-muted/20'
              )}
            >
              {/* Type dot */}
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5', typeColor(n.type))}>
                <Bell className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold' : 'font-medium')}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {n.type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                      {CATEGORY_LABELS[n.type] ?? n.type.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.created_at)}</span>
                  {!n.is_read && (
                    <span className="text-[10px] text-primary font-semibold">● New</span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {deleting === n.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
