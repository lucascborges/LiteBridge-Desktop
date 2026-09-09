import { useAppStore } from '../store/useAppStore'
import { translations, type Language, type TranslationKey } from './translations'

export const useTranslation = () => {
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const langDict = translations[language] || translations.en
    let text: string = langDict[key] || translations.en[key] || (key as string)

    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val))
      })
    }

    return text
  }

  return { t, language, setLanguage }
}
