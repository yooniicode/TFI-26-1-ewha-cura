'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { ko } from './ko'
import { en } from './en'
import { vi } from './vi'
import { zh } from './zh'
import { km } from './km'
import { my } from './my'
import { fil } from './fil'
import { id } from './id'
import { th } from './th'
import { ne } from './ne'
import { mn } from './mn'
import { uz } from './uz'
import { si } from './si'
import { bn } from './bn'
import { ur } from './ur'
import type { AppTranslation } from './ko'

export type Language =
  | 'ko' | 'en' | 'vi' | 'zh' | 'km' | 'my' | 'fil' | 'id'
  | 'th' | 'ne' | 'mn' | 'uz' | 'si' | 'bn' | 'ur'

const dictionaries: Record<Language, AppTranslation> = {
  ko, en, vi, zh, km, my, fil, id, th, ne, mn, uz, si, bn, ur,
}

export interface LanguageMeta {
  code: Language
  nativeName: string
  dir: 'ltr' | 'rtl'
}

export const LANGUAGE_META: LanguageMeta[] = [
  { code: 'ko', nativeName: '한국어', dir: 'ltr' },
  { code: 'en', nativeName: 'English', dir: 'ltr' },
  { code: 'vi', nativeName: 'Tiếng Việt', dir: 'ltr' },
  { code: 'zh', nativeName: '中文', dir: 'ltr' },
  { code: 'km', nativeName: 'ខ្មែរ', dir: 'ltr' },
  { code: 'my', nativeName: 'မြန်မာ', dir: 'ltr' },
  { code: 'fil', nativeName: 'Filipino', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'th', nativeName: 'ไทย', dir: 'ltr' },
  { code: 'ne', nativeName: 'नेपाली', dir: 'ltr' },
  { code: 'mn', nativeName: 'Монгол', dir: 'ltr' },
  { code: 'uz', nativeName: "O'zbek", dir: 'ltr' },
  { code: 'si', nativeName: 'සිංහල', dir: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'ur', nativeName: 'اردو', dir: 'rtl' },
]

interface I18nContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: AppTranslation
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ko')

  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Language
    if (saved && dictionaries[saved]) {
      setLangState(saved)
    }
  }, [])

  useEffect(() => {
    const meta = LANGUAGE_META.find((m) => m.code === lang)
    document.documentElement.lang = dictionaries[lang].locale
    document.documentElement.dir = meta?.dir ?? 'ltr'
  }, [lang])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('app-lang', newLang)
    // Optional: Sync to Supabase user metadata if logged in
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used within an I18nProvider')
  return ctx
}
