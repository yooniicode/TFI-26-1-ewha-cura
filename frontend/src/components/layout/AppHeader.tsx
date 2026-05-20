'use client'

import Link from 'next/link'
import clsx from 'clsx'
import LayoutModeToggle from './LayoutModeToggle'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import type { LayoutMode } from '@/hooks/useLayoutMode'
import type { AuthMe } from '@/lib/types'

interface AppHeaderProps {
  me?: AuthMe | null
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  pendingApprovals?: number
  signupRequestLabel?: string
  onMenuClick?: () => void
}

export default function AppHeader({
  me,
  layoutMode,
  onLayoutModeChange,
  pendingApprovals = 0,
  signupRequestLabel = '가입 요청',
  onMenuClick,
}: AppHeaderProps) {
  const isDesktopMode = layoutMode === 'desktop'

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 md:px-6 flex items-center justify-between gap-3">
      {onMenuClick ? (
        <button
          onClick={onMenuClick}
          className="shrink-0 flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-800 rounded-lg"
          aria-label="메뉴 열기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      ) : (
        <Link
          href="/dashboard"
          className={clsx('font-bold text-primary-700 text-lg shrink-0', isDesktopMode && 'md:hidden')}
        >
          LinkUs
        </Link>
      )}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {me && (
          <span className="max-w-[96px] truncate text-xs text-gray-500 md:max-w-xs">
            {me.name ?? me.role}
          </span>
        )}
        {/* Admin signup approval badge disabled. */}
        {false && pendingApprovals > 0 && (
          <Link
            href="/members"
            className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            {signupRequestLabel} {pendingApprovals}
          </Link>
        )}
        <LanguageSwitcher />
        <LayoutModeToggle mode={layoutMode} onChange={onLayoutModeChange} />
        <Link
          href="/mypage"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
          aria-label="마이페이지"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
