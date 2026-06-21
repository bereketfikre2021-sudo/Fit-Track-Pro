import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import am from '../locales/am.json'

export const SUPPORTED_LOCALES = ['en', 'am']

export const LOCALE_LABELS = {
  en: 'English',
  am: 'አማርኛ',
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'en'
}

export function setAppLocale(locale) {
  const lng = normalizeLocale(locale)
  void i18n.changeLanguage(lng)
  document.documentElement.lang = lng === 'am' ? 'am' : 'en'
  return lng
}

export default i18n
