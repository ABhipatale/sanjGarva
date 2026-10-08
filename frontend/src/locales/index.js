import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import mr from './mr.json'
import { storage } from '../utils/storage'

export const LANGUAGES = [
  { code: 'mr', label: 'मराठी' },
  { code: 'en', label: 'English' },
]

const initial = storage.get('sg_lang') || 'mr'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, mr: { translation: mr } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

document.documentElement.lang = initial

i18n.on('languageChanged', (lng) => {
  storage.set('sg_lang', lng)
  document.documentElement.lang = lng
})

export default i18n
