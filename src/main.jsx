import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n'
import App from './App'
import './index.css'

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
