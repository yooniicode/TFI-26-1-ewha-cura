'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import MaskIcon from './ui/MaskIcon'
import NavItem, { type NavIconSpec } from './ui/NavItem'
import NotificationPopover from './NotificationPopover'

const MAIN_NAV: { href: string; label: string; icon: NavIconSpec }[] = [
  { href: '/',             label: '대시보드',      icon: { src: '/icons/home.svg' } },
  { href: '/matching',     label: '매칭 관리',     icon: { src: '/icons/switch.svg', rotate: true } },
  { href: '/reports',      label: '보고서 관리',   icon: { src: '/icons/report.svg', flip: true } },
  { href: '/patients',     label: '이주민 관리',   icon: { src: '/icons/user.svg' } },
  { href: '/interpreters', label: '통번역가 관리', icon: { src: '/icons/talk.svg', flip: true } },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

/**
 * Figma: 컴포넌트관리 › Sidebar
 * - 기본: 220px, 로고 + 메뉴 라벨 + 하단 계정
 * - 베리언트2(collapsed): 76px, 로고 마크 + 아이콘만
 */
export default function Sidebar({ accountName, onLogout, collapsed = false }: {
  accountName: string
  onLogout: () => void
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const [noticeOpen, setNoticeOpen] = useState(false)
  const closeNotice = useCallback(() => setNoticeOpen(false), [])

  return (
    <aside
      className={clsx(
        'sticky top-0 flex h-screen shrink-0 flex-col justify-between overflow-hidden bg-surface-sidebar px-4 py-6',
        collapsed ? 'w-[76px] items-center' : 'w-[220px]',
      )}
    >
      <div className={clsx('flex flex-col gap-1', collapsed ? 'items-center' : 'w-[180px] items-start')}>
        <Link href="/" aria-label="Cura 관리자 홈" className={clsx(collapsed && 'pb-5')}>
          {collapsed
            ? <img src="/icons/logo-mark.svg" alt="Cura" width={34.33} height={34.33} />
            : <img src="/icons/logo.svg" alt="Cura" width={103} height={54.33} />}
        </Link>

        <nav className="flex w-full flex-col items-start gap-2">
          {MAIN_NAV.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}

          <hr className="w-full border-line" />

          <NavItem
            label="새로운 알림"
            icon={{ src: '/icons/notification.svg' }}
            active={noticeOpen || isActive(pathname, '/notifications')}
            collapsed={collapsed}
            onClick={() => setNoticeOpen(v => !v)}
            attrs={{ 'aria-expanded': noticeOpen, 'data-notice-toggle': true }}
          />
          <NavItem
            href="/settings"
            label="환경설정"
            icon={{ src: '/icons/gear.svg' }}
            active={isActive(pathname, '/settings')}
            collapsed={collapsed}
          />
        </nav>
      </div>

      {collapsed ? (
        // 접힌 상태는 Figma 에 계정 영역이 없어 아바타만 두고 로그아웃을 연결한다
        <button
          type="button"
          onClick={onLogout}
          title={`${accountName} · 로그아웃`}
          className="flex h-10 items-center px-3"
        >
          <span className="size-5 rounded-full bg-brand-blue" />
          <span className="sr-only">로그아웃</span>
        </button>
      ) : (
        <div className="flex h-10 w-full items-center gap-[10px] px-3 py-[10px]">
          <span className="size-5 shrink-0 rounded-full bg-brand-blue" />
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{accountName}</span>
          <button
            type="button"
            onClick={onLogout}
            title="로그아웃"
            className="shrink-0 rounded-[6px] p-0.5 text-ink-grey2 hover:text-ink"
          >
            <MaskIcon src="/icons/24/exit.svg" size={18} />
            <span className="sr-only">로그아웃</span>
          </button>
        </div>
      )}

      {noticeOpen && <NotificationPopover onClose={closeNotice} offsetLeft={collapsed ? 84 : 145} />}
    </aside>
  )
}
