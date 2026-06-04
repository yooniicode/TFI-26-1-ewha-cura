'use client'

import { useI18nUseCase } from '@/hooks/useI18nUseCase'
import type { Language } from '@/lib/i18n/I18nContext'

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string; title: string }> = [
  { value: 'ko', label: 'KO', title: '한국어' },
  { value: 'en', label: 'EN', title: 'English' },
  { value: 'vi', label: 'VI', title: 'Tiếng Việt' },
]

export default function LanguageSwitcher() {
  const { lang, changeLanguage } = useI18nUseCase()

  return (
    <div
      role="group"
      aria-label="언어 선택"
      className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 shadow-sm"
    >
      {LANGUAGE_OPTIONS.map(option => {
        const selected = lang === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-label={option.title}
            title={option.title}
            onClick={() => changeLanguage(option.value)}
            className={`min-w-9 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              selected
                ? 'bg-[#2592FF] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
