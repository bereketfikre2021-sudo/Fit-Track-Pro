/**
 * useOnlineStatus
 *
 * Returns { isOnline, wasOffline } and fires a callback when
 * the browser reconnects to the network.
 *
 * Uses both the navigator.onLine flag and the online/offline
 * window events for reliable cross-browser detection.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export function useOnlineStatus({ onReconnect } = {}) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const wasOfflineRef = useRef(!navigator.onLine)
  const onReconnectRef = useRef(onReconnect)

  // Keep callback ref fresh without re-subscribing events
  useEffect(() => {
    onReconnectRef.current = onReconnect
  })

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false
        onReconnectRef.current?.()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      wasOfflineRef.current = true
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline: wasOfflineRef.current }
}
