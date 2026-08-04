/**
 * firebase-messaging-sw.js
 *
 * Firebase Cloud Messaging background service worker.
 * This file MUST be served from the root scope ("/") so that FCM can find it.
 * Vite's public/ folder serves files at the root — no build step required.
 *
 * IMPORTANT:
 *   - Do NOT import VITE_ env vars here — this file runs outside the Vite build
 *     pipeline. Firebase config is injected at runtime via the __FIREBASE_CONFIG__
 *     global that the main app sets before the SW is registered (see useFcm.js),
 *     OR you duplicate the config values below (they are public identifiers).
 *   - Keep the firebase compat SDK version in sync with the main bundle.
 *
 * How it works:
 *   • When a push message arrives and the app tab is closed / in background,
 *     Chrome/Edge/Firefox deliver it to this SW which calls showNotification().
 *   • When the app is in the foreground, onMessage() in useFcm.js intercepts it
 *     and this SW does NOT show a duplicate native notification.
 */

// Use the Firebase compat CDN build — version matches installed firebase package.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

// ---------------------------------------------------------------------------
//  Firebase config
//  These are PUBLIC identifiers — safe to include in a service worker.
//  They match the VITE_FIREBASE_* values in .env.local
// ---------------------------------------------------------------------------
const firebaseConfig = self.__FIREBASE_CONFIG__ || {
  apiKey:            'AIzaSyBiYgxLlmqAjBWmmtRxbT9kEkNuPMm8Smc',
  authDomain:        'fit-track-pro-d4e6f.firebaseapp.com',
  projectId:         'fit-track-pro-d4e6f',
  storageBucket:     'fit-track-pro-d4e6f.firebasestorage.app',
  messagingSenderId: '384275195217',
  appId:             '1:384275195217:web:743b5c3eae90068e6d1f70',
}

// Only initialise if we have at least a projectId (avoids errors in dev/placeholder env)
if (firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('your-')) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  /**
   * Handle background push messages.
   * The payload shape from FCM:
   *   { notification: { title, body, icon }, data: { ... } }
   *
   * showNotification() renders a native OS notification — works even when
   * the browser tab is closed (as long as the browser process is running).
   */
  messaging.onBackgroundMessage((payload) => {
    const { title = 'FitTrack Pro', body = '', icon } = payload?.notification ?? {}

    self.registration.showNotification(title, {
      body,
      icon:    icon || '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     payload?.data?.tag || 'fittrack-push',
      data:    payload?.data || {},
      vibrate: [200, 80, 200],
    })
  })

  /**
   * Handle notification click — bring the app tab to the foreground
   * or open it if no tab is currently open.
   */
  self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const urlToOpen = event.notification.data?.url || '/'

    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If a tab is already open, focus it
          for (const client of clientList) {
            if ('focus' in client) {
              client.focus()
              return
            }
          }
          // Otherwise open a new tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen)
          }
        })
    )
  })
}
