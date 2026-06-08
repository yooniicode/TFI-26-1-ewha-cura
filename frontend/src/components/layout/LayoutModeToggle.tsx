'use client'

import clsx from 'clsx'
import type { LayoutMode } from '@/hooks/useLayoutMode'
import { useTranslation } from '@/lib/i18n/I18nContext'

interface LayoutModeToggleProps {
  mode: LayoutMode
  onChange: (mode: LayoutMode) => void
}

export default function LayoutModeToggle({ mode, onChange }: LayoutModeToggleProps) {
  const isDesktopMode = mode === 'desktop'
  const { t } = useTranslation()

  return (
    <div className="inline-flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs" aria-label="Layout mode">
      <button
        type="button"
        aria-pressed={!isDesktopMode}
        onClick={() => onChange('mobile')}
        className={clsx(
          'rounded-md px-2 py-1 font-medium transition-colors',
          !isDesktopMode ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800',
        )}
      >
        {t.drawer.mobile_mode}
      </button>
      <button
        type="button"
        aria-pressed={isDesktopMode}
        onClick={() => onChange('desktop')}
        className={clsx(
          'rounded-md px-2 py-1 font-medium transition-colors',
          isDesktopMode ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-800',
        )}
      >
        {t.drawer.pc_mode}
      </button>
    </div>
  )
}
