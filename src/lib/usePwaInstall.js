import { useState, useEffect, useCallback } from 'react'
import { isPwaInstalled } from './pwaNotifications'

const SESSION_KEY = 'fittrack-pwa-install-dismissed'
const SHOW_DELAY_MS = 2000

function isSessionDismissed() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function setSessionDismissed() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // ignore quota / private mode
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [delayPassed, setDelayPassed] = useState(false)
  const [visible, setVisible] = useState(false)

  const installed = isPwaInstalled()

  useEffect(() => {
    if (installed || isSessionDismissed()) return

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    const timer = setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      clearTimeout(timer)
    }
  }, [installed])

  useEffect(() => {
    if (installed || isSessionDismissed()) {
      setVisible(false)
      return
    }
    if (delayPassed && deferredPrompt) {
      setVisible(true)
    }
  }, [installed, delayPassed, deferredPrompt])

  const dismiss = useCallback(() => {
    setSessionDismissed()
    setVisible(false)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setVisible(false)
      }
    } catch {
      // prompt may fail if already consumed
    }
  }, [deferredPrompt])

  return {
    visible: visible && !installed && !isSessionDismissed(),
    canInstall: Boolean(deferredPrompt),
    dismiss,
    install,
  }
}
