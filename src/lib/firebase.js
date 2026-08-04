/**
 * firebase.js
 *
 * Initialises the Firebase app and exports the Messaging instance.
 * All config is read from VITE_ environment variables — nothing is hardcoded.
 *
 * FCM works in two modes:
 *   • Foreground  — handled here via onMessage()
 *   • Background  — handled by the dedicated service worker
 *                   (public/firebase-messaging-sw.js)
 */

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

// ── Firebase config from env vars ────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

/** Returns true only when all required env vars are set (not placeholders). */
export function isFirebaseConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.startsWith('your-')
  )
}

// ── Singleton app initialisation ─────────────────────────────────────────────
let app = null
let messagingInstance = null

function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    // Avoid double-initialisation in React StrictMode / HMR
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return app
}

/**
 * Returns the Firebase Messaging instance, or null if:
 *   - Firebase is not configured
 *   - The browser does not support FCM (e.g. Safari < 16.4, Firefox on iOS)
 */
export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  try {
    const supported = await isSupported()
    if (!supported) {
      console.info('[FCM] Firebase Messaging is not supported in this browser.')
      return null
    }
    messagingInstance = getMessaging(firebaseApp)
    return messagingInstance
  } catch (err) {
    console.warn('[FCM] Failed to initialise Firebase Messaging:', err?.message)
    return null
  }
}
