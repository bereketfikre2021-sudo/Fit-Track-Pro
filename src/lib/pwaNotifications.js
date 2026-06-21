/**
 * Show notifications through the PWA service worker when possible.
 * Installed PWAs use the same native notification UI as apps; delivery still
 * depends on how the reminder was triggered (in-app timer vs Web Push server).
 */

export async function getServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export function isPwaInstalled() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

/**
 * @param {string} title
 * @param {{ body?: string, tag?: string, data?: Record<string, unknown> }} [options]
 */
export async function showAppNotification(title, options = {}) {
  const { body = '', tag, data } = options
  const payload = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: tag || 'fittrack-meal',
    data: data || {},
    vibrate: [200, 80, 200],
  }

  const registration = await getServiceWorkerRegistration()
  if (registration && typeof registration.showNotification === 'function') {
    await registration.showNotification(title, payload)
    return 'service-worker'
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: payload.icon, tag: payload.tag })
    return 'window'
  }

  return null
}

export async function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}
