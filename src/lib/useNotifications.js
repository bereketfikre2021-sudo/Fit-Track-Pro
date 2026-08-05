import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'

/**
 * useNotifications
 *
 * Manages in-app notification state for the authenticated user.
 *
 * Fetches up to 50 in_app notifications from Supabase on mount, subscribes
 * to Realtime INSERT events for new notifications, and exposes controls for
 * opening the panel and marking all notifications as read.
 *
 * Returns empty/default state if no authenticated user is present.
 */
export function useNotifications() {
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const [isOpen, setIsOpen]               = useState(false)

  // ── Initial fetch ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) {
      // No authenticated user — reset to empty state
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      setIsOpen(false)
      return
    }

    let cancelled = false

    const fetchNotifications = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('channel', 'in_app')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('[useNotifications] fetch error:', error)
          return
        }

        if (!cancelled) {
          setNotifications(data ?? [])
          setUnreadCount((data ?? []).filter((n) => !n.is_read).length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNotifications()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new
          // Only surface in_app channel items
          if (newNotification.channel !== 'in_app') return

          setNotifications((prev) => [newNotification, ...prev])
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // ── markAllRead ──────────────────────────────────────────────────────────────

  const markAllRead = useCallback(async () => {
    if (!user?.id) return

    // Optimistic update — immediately reflect changes in the UI
    setNotifications((prev) =>
      prev.map((n) => (n.is_read ? n : { ...n, is_read: true, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)

    // Persist to Supabase — single UPDATE for all unread rows
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('[useNotifications] markAllRead error:', error)
    }
  }, [user?.id])

  // ── openPanel / closePanel ───────────────────────────────────────────────────

  const openPanel = useCallback(() => {
    setIsOpen(true)
    if (unreadCount > 0) {
      markAllRead()
    }
  }, [unreadCount, markAllRead])

  const closePanel = useCallback(() => {
    setIsOpen(false)
  }, [])

  // ── Return ───────────────────────────────────────────────────────────────────

  return {
    notifications,
    unreadCount,
    loading,
    isOpen,
    openPanel,
    closePanel,
    markAllRead,
  }
}
