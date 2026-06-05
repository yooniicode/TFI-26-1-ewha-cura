import type { AppTranslation } from '@/lib/i18n/ko'
import type { UserRole } from '@/lib/types'

export interface NavItem {
  href: string
  label: string
  icon: string
  roles: UserRole[]
  badgeCount?: number
}

export function getNavItems(t: AppTranslation): NavItem[] {
  return [
    { href: '/dashboard',     label: t.nav.home,          icon: 'home',     roles: ['interpreter', 'patient', 'admin'] },
    { href: '/consultations', label: t.nav.consultations, icon: 'report',   roles: ['interpreter', 'admin'] },
    { href: '/patients',      label: t.nav.patients,      icon: 'patients', roles: ['interpreter', 'admin'] },
    { href: '/members',       label: t.nav.members,       icon: 'members',  roles: ['admin'] },
    { href: '/sheets',        label: '시트 연동',          icon: 'sheets',   roles: ['admin'] },
    { href: '/my-records',    label: t.nav.my_records,    icon: 'records',  roles: ['patient'] },
    { href: '/chat',          label: t.nav.chat,          icon: 'chat',     roles: ['interpreter', 'patient', 'admin'] },
  ]
}
