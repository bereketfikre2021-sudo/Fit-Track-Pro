import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import App from './App'
import './index.css'

/**
 * Inject Firebase config into the service worker scope so that
 * firebase-messaging-sw.js can read it without hardcoding values.
 * This runs before the SW is registered and the values are public
 * identifiers (not secrets).
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: '__FIREBASE_CONFIG__',
      config: {
        apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? '',
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? '',
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? '',
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '',
      },
    })
  }).catch(() => { /* SW not yet active on first load — config is already embedded */ })
}

registerSW({
  immediate: true,
  onRegistered() {
    // Service worker enables PWA notifications via registration.showNotification()
  },
  onRegisterError(error) {
    console.warn('[FitTrack Pro] Service worker registration failed:', error)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
