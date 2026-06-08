'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18nUseCase } from '@/hooks/useI18nUseCase'
import { LANGUAGE_META } from '@/lib/i18n/I18nContext'

export default function LanguageSwitcher() {
  const { lang, changeLanguage } = useI18nUseCase()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = LANGUAGE_META.find(meta => meta.code === lang) ?? LANGUAGE_META[0]

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language selection"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
      >
        <span>{current.nativeName}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language list"
          className="absolute right-0 z-50 mt-1 max-h-80 w-44 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {LANGUAGE_META.map(meta => {
            const selected = lang === meta.code
            return (
              <li key={meta.code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    changeLanguage(meta.code)
                    setOpen(false)
                  }}
                  dir={meta.dir}
                  className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
                    selected
                      ? 'bg-[#2592FF] text-white font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  {meta.nativeName}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
