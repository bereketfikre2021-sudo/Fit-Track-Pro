/**
 * OfflineIndicator
 *
 * Shows a non-intrusive banner when the device is offline.
 * Disappears automatically 3 seconds after reconnecting.
 * Also shows how many writes are pending sync.
 */

import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { queueSize, drainQueue } from '../lib/offlineQueue'
import { useAuth } from '../lib/useAuth'

export function OfflineIndicator() {
  const { user } = useAuth()
  const [syncing, setSyncing]         = useState(false)
  const [justSynced, setJustSynced]   = useState(false)
  const [pending, setPending]         = useState(() => queueSize())
  const [visible, setVisible]         = useState(false)

  const { isOnline } = useOnlineStatus({
    onReconnect: async () => {
      setPending(queueSize())
      if (!user?.id) return

      // Show "syncing" state, drain queue, then show "synced" briefly
      setSyncing(true)
      const { flushed } = await drainQueue()
      setSyncing(false)

      if (flushed > 0) {
        setJustSynced(true)
        setPending(queueSize())
        setTimeout(() => {
          setJustSynced(false)
          setVisible(false)
        }, 3000)
      } else {
        setVisible(false)
      }
    },
  })

  // Refresh pending count whenever online status or component mounts
  useEffect(() => {
    setPending(queueSize())
  }, [isOnline])

  // Show banner when offline; hide 3 s after reconnect (unless syncing)
  useEffect(() => {
    if (!isOnline) {
      setVisible(true)
      setJustSynced(false)
    }
  }, [isOnline])

  if (!visible) return null

  // ── States ────────────────────────────────────────────────────────────────
  const isSyncing = isOnline && syncing
  const isSynced  = isOnline && justSynced && !syncing
  const isOffline = !isOnline

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg',
        'text-sm font-medium border transition-all duration-300',
        'animate-in slide-in-from-bottom-2 fade-in',
        isOffline && 'bg-secondary border-border text-foreground',
        isSyncing && 'bg-secondary border-primary/40 text-primary',
        isSynced  && 'bg-primary/10 border-primary/40 text-primary',
      )}
    >
      {isOffline && (
        <>
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          <span>
            You&apos;re offline
            {pending > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                · {pending} pending
              </span>
            )}
          </span>
        </>
      )}

      {isSyncing && (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>Syncing{pending > 0 ? ` ${pending} changes…` : '…'}</span>
        </>
      )}

      {isSynced && (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>All changes synced</span>
        </>
      )}
    </div>
  )
}

export default OfflineIndicator
