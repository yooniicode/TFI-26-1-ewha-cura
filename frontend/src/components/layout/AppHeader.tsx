'use client'

import Link from 'next/link'
import clsx from 'clsx'
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
  onMenuClick,
}: AppHeaderProps) {
  const isDesktopMode = layoutMode === 'desktop'

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0] px-4 py-3 flex items-center justify-between gap-3">
      {onMenuClick ? (
        <button
          onClick={onMenuClick}
          className="shrink-0 flex items-center justify-center w-8 h-8 text-[#161616] rounded-lg hover:bg-[#F5F5F5] transition-colors"
          aria-label="Open menu"
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
          className={clsx('font-bold text-[#2592FF] text-lg shrink-0', isDesktopMode && 'md:hidden')}
        >
          LinkUs
        </Link>
      )}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {me && (
          <span className="max-w-[96px] truncate text-xs text-[#808080]">
            {me.name ?? me.role}
          </span>
        )}
        <LanguageSwitcher />
        <Link
          href="/mypage"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#EEEEEE] text-[#494949] transition-colors hover:border-[#2592FF]/30 hover:bg-[#f3f9ff] hover:text-[#2592FF]"
          aria-label="My page"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
