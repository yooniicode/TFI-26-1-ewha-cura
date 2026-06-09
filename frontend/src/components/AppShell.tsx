'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import AppHeader from '@/components/layout/AppHeader'
import AuthGateOverlays from '@/components/layout/AuthGateOverlays'
import { DesktopSidebar, DesktopTopNav } from '@/components/layout/AppNavigation'
import { getNavItems } from '@/components/layout/navItems'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useMe } from '@/hooks/useMe'
import { authApi, chatApi } from '@/lib/api'
import { clearAccessToken } from '@/lib/auth-token'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { queryKeys } from '@/lib/queryKeys'
import type { AuthMe } from '@/lib/types'

// ─── 역할별 드로어 네비 아이템 ──────────────────────────────────────────────────

interface DrawerNavItem {
  href: string
  label: string
  iconSrc?: string
  inlineSvg?: string
  badgeCount?: number
}

import type { AppTranslation } from '@/lib/i18n/ko'

function getDrawerNavItems(me: AuthMe | null | undefined, t: AppTranslation, unreadCount: number): DrawerNavItem[] {
  const home: DrawerNavItem = { href: '/dashboard', label: t.drawer.home, inlineSvg: 'home' }
  const mypage: DrawerNavItem = { href: '/mypage', label: t.drawer.mypage, inlineSvg: 'user' }
  const chat: DrawerNavItem = { href: '/chat', label: t.nav.chat, inlineSvg: 'chat', badgeCount: unreadCount }

  if (me?.role === 'interpreter') {
    return [
      home,
      { href: '/rm/new',             label: t.drawer.realtime_memo, iconSrc: '/icons/interpreter/home/실시간메모작성.svg' },
      { href: '/consultations/start', label: t.drawer.report,        iconSrc: '/icons/interpreter/home/보고서.svg' },
      { href: '/patients',            label: t.drawer.my_patients,   iconSrc: '/icons/interpreter/home/담당환자.svg' },
      { href: '/consultations',       label: t.drawer.my_activity,   iconSrc: '/icons/interpreter/home/나의활동.svg' },
      { href: '/consultations/schedule', label: t.drawer.add_schedule, inlineSvg: 'calendar-plus' },
      chat,
      mypage,
    ]
  }

  if (me?.role === 'patient') {
    return [
      home,
      { href: '/chat',                                                label: t.drawer.medical_translation, iconSrc: '/icons/immigrant/home/의료통번역.svg', badgeCount: unreadCount },
      { href: '/emergency-call',                                      label: t.drawer.emergency_call,      iconSrc: '/icons/immigrant/home/긴급전화.svg' },
      { href: '/my-records',                                          label: t.drawer.medical_records,     iconSrc: '/icons/immigrant/home/진료기록.svg' },
      { href: me.entityId ? `/scripts/patient/${me.entityId}` : '#', label: t.drawer.medical_script,      iconSrc: '/icons/immigrant/home/의료대본.svg' },
      mypage,
    ]
  }

  // 센터 담당자(admin)
  if (me?.role === 'admin') {
    return [
      home,
      { href: '/patients',      label: t.nav.patients,      inlineSvg: 'patients' },
      { href: '/consultations', label: t.nav.consultations, inlineSvg: 'report' },
      { href: '/members',       label: t.nav.members,       inlineSvg: 'members' },
      { href: '/interpreters',  label: t.nav.interpreters,  inlineSvg: 'interpreters' },
      { href: '/sheets',        label: t.nav.sheets,        inlineSvg: 'sheets' },
      { ...chat },
      mypage,
    ]
  }

  return [home, mypage]
}

// SVG 아이콘 — 모두 20×20, 검정색(stroke="currentColor") 통일
function DrawerIcon({ item }: { item: DrawerNavItem }) {
  // iconSrc: brightness(0) 필터로 모든 색상 → 검정
  if (item.iconSrc) {
    return (
      <img
        src={item.iconSrc}
        alt=""
        width={20}
        height={20}
        className="shrink-0"
        style={{ filter: 'brightness(0)', width: 20, height: 20 }}
      />
    )
  }
  const svgClass = 'shrink-0 text-[#161616]'
  const svgProps = {
    width: 20, height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: svgClass,
  }

  switch (item.inlineSvg) {
    case 'home':
      return (
        <svg {...svgProps}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'user':
      return (
        <svg {...svgProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'patients':
      return (
        <svg {...svgProps}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'report':
      return (
        <svg {...svgProps}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...svgProps}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    case 'calendar-plus':
      return (
        <svg {...svgProps}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="12" y1="14" x2="12" y2="18" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      )
    default:
      return null
  }
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children, noPadding = false }: { children: React.ReactNode; noPadding?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: me } = useMe()
  const { layoutMode, setLayoutMode } = useLayoutMode()
  const { t } = useTranslation()
  const isDesktopMode = layoutMode === 'desktop'
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const drawerItems = getDrawerNavItems(me, t, unreadChatCount)

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // 토큰이 이미 만료된 경우에도 클라이언트 세션은 정리한다.
    } finally {
      clearAccessToken()
      queryClient.clear()
      router.replace('/login')
      router.refresh()
    }
  }

  const roleLabel = me?.role === 'interpreter' ? t.dashboard.role_interpreter
    : me?.role === 'patient' ? t.dashboard.role_patient
    : me?.role === 'admin' ? t.dashboard.role_admin
    : ''

  return (
    <div className={clsx(
      'min-h-screen bg-gray-50',
      !isDesktopMode && 'max-w-[402px] mx-auto bg-white shadow-sm',
    )}>
      <AuthGateOverlays me={me} pathname={pathname} />

      {/* 드로어 오버레이 */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* 드로어 */}
      <div className={clsx(
        'fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ease-out',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* 드로어 헤더: PC/모바일 토글 + 프로필 + 닫기 */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            {/* PC/모바일 토글 */}
            <button
              onClick={() => setLayoutMode(isDesktopMode ? 'mobile' : 'desktop')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {isDesktopMode ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  {t.drawer.mobile_mode}
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  {t.drawer.pc_mode}
                </>
              )}
            </button>

            {/* 닫기 버튼 */}
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

          {/* 프로필 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DEE2FF] flex items-center justify-center text-indigo-700 font-bold text-base shrink-0 overflow-hidden">
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{me?.name?.charAt(0) ?? '?'}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[#161616] truncate">{me?.name ?? t.chat.no_name}</p>
              <p className="text-xs text-[#808080] truncate">
                {roleLabel}{me?.centerName ? ` · ${me.centerName}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {drawerItems.map(item => {
            const active = item.href !== '#' && pathname.startsWith(item.href) && item.href !== '/dashboard'
              ? true
              : pathname === '/dashboard' && item.href === '/dashboard'
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
                  active
                    ? 'bg-[#f3f9ff] text-[#2592FF] font-semibold'
                    : 'text-[#494949] hover:bg-gray-50 hover:text-[#161616]',
                )}
              >
                <DrawerIcon item={item} />
                <span className="flex-1">{item.label}</span>
                {!!item.badgeCount && item.badgeCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-[#2592FF] text-white text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 로그아웃 */}
        <div className="px-3 pb-6 pt-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#808080] hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t.drawer.logout}
          </button>
        </div>
      </div>

      {/* 메인 레이아웃 */}
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
