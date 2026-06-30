import { useEffect } from 'react'
import { setAppLocale } from '@/i18n'
import { getAppSettings } from '@/lib/appSettings'

/** Keeps i18next in sync with persisted app settings. */
function I18nSync({ state, children }) {
  const locale = getAppSettings(state).locale

  useEffect(() => {
    setAppLocale(locale)
  }, [locale])

  return children
}

export default I18nSync
