'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import AppHeader from '@/components/layout/AppHeader'
import AuthGateOverlays from '@/components/layout/AuthGateOverlays'
import { DesktopSidebar, DesktopTopNav, NavIcon } from '@/components/layout/AppNavigation'
import { getNavItems } from '@/components/layout/navItems'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useMe } from '@/hooks/useMe'
import { chatApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { queryKeys } from '@/lib/queryKeys'

export default function AppShell({ children, noPadding = false }: { children: React.ReactNode; noPadding?: boolean }) {
  const pathname = usePathname()
  const { data: me } = useMe()
  const { layoutMode, setLayoutMode } = useLayoutMode()
  const { t } = useTranslation()
  const isDesktopMode = layoutMode === 'desktop'
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Admin approval polling is disabled with the rest of the admin feature set.
  const pendingApprovals = 0
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.chat.unreadCount(),
    queryFn: () => chatApi.unreadCount().then(r => r.payload?.total ?? 0),
    enabled: !!me,
    refetchInterval: 30000,
  })
  const unreadChatCount = unreadData ?? 0
  const visibleNav = me?.role
    ? getNavItems(t)
      .filter(item => item.roles.includes(me.role!))
      .map(item => {
        if (item.href === '/members') return { ...item, badgeCount: pendingApprovals }
        if (item.href === '/chat') return { ...item, badgeCount: unreadChatCount }
        return item
      })
    : []

  return (
    <div className={clsx(
      'min-h-screen bg-gray-50',
      !isDesktopMode && 'max-w-lg mx-auto bg-white shadow-sm',
    )}>
      <AuthGateOverlays me={me} pathname={pathname} />

      {/* 드로어 */}
      <>
        {drawerOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDrawerOpen(false)}
          />
        )}
        <div className={clsx(
          'fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-2xl transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <Link href="/dashboard" onClick={() => setDrawerOpen(false)}
                className="font-bold text-primary-700 text-lg">LinkUs</Link>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="px-2 py-3 space-y-0.5">
              {visibleNav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800',
                  )}
                >
                  <NavIcon name={item.icon} size={18} />
                  <span>{item.label}</span>
                  {!!item.badgeCount && (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
      </>

      <div className={clsx('min-h-screen', isDesktopMode ? 'flex' : 'flex flex-col')}>
        {isDesktopMode && <DesktopSidebar items={visibleNav} pathname={pathname} />}

        <div className="flex min-h-screen flex-1 flex-col bg-white">
          <AppHeader
            me={me}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            pendingApprovals={pendingApprovals}
            signupRequestLabel={t.common.signup_requests}
            onMenuClick={() => setDrawerOpen(true)}
          />
          {isDesktopMode && <DesktopTopNav items={visibleNav} pathname={pathname} />}

          <main className={clsx(
            'flex-1 overflow-y-auto',
            isDesktopMode ? 'px-4 py-5 md:px-6 md:py-6' : noPadding ? 'pb-0' : 'pb-6 px-4 pt-4',
          )}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
