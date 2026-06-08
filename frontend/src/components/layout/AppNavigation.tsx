'use client'

import Link from 'next/link'
import clsx from 'clsx'
import type { NavItem } from './navItems'

interface AppNavigationProps {
  items: NavItem[]
  pathname: string
}

export function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'report':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      )
    case 'patients':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'handover':
      return (
        <svg {...props}>
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 014-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 01-4 4H3" />
        </svg>
      )
    case 'records':
      return (
        <svg {...props}>
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="16" y1="11" x2="8" y2="11" />
          <line x1="16" y1="15" x2="8" y2="15" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    default:
      return <span className="text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
  }
}

export function DesktopSidebar({ items, pathname }: AppNavigationProps) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-4">
      <Link href="/dashboard" className="mb-6 font-bold text-primary-700 text-xl">Cura</Link>
      <nav className="space-y-1">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary-50 text-primary-700 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
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
    </aside>
  )
}

export function DesktopTopNav({ items, pathname }: AppNavigationProps) {
  if (items.length === 0) return null

  return (
    <nav className="md:hidden border-b border-gray-100 bg-white px-2 py-1.5">
      <div className="flex gap-1 overflow-x-auto">
        {items.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors',
                active ? 'text-primary-700 bg-primary-50' : 'text-gray-400',
              )}
            >
              <NavIcon name={item.icon} size={20} />
              <span className="text-[10px] font-medium relative">
                {item.label}
                {!!item.badgeCount && (
                  <span className="absolute -top-1.5 -right-3 rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-semibold text-white leading-none">
                    {item.badgeCount}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileBottomNav({ items, pathname }: AppNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex justify-around z-10">
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            'flex flex-col items-center py-2 px-2 text-xs gap-0.5 flex-1',
            pathname.startsWith(item.href)
              ? 'text-primary-600 font-semibold'
              : 'text-gray-400',
          )}
        >
          <NavIcon name={item.icon} size={20} />
          <span className="relative max-w-full truncate">
            {item.label}
            {!!item.badgeCount && (
              <span className="ml-1 rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                {item.badgeCount}
              </span>
            )}
          </span>
        </Link>
      ))}
    </nav>
  )
}
