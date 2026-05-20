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
    { href: '/dashboard',         label: t.nav.home,             icon: 'home',     roles: ['interpreter', 'patient'] },
    { href: '/consultations',     label: t.nav.consultations,    icon: 'report',   roles: ['interpreter'] },
    { href: '/patients',          label: t.nav.patients,         icon: 'patients', roles: ['interpreter'] },
    // { href: '/handovers',         label: t.nav.handovers,        icon: 'handover', roles: ['interpreter'] },
    // { href: '/matching',          label: t.nav.matching,         icon: 'M', roles: ['admin'] },
    // { href: '/interpreters',      label: t.nav.interpreters,     icon: 'I', roles: ['admin'] },
    // { href: '/members',           label: t.nav.members,          icon: 'S', roles: ['admin'] },
    { href: '/my-records',        label: t.nav.my_records,       icon: 'records',  roles: ['patient'] },
    { href: '/chat',              label: t.nav.chat,             icon: 'chat',     roles: ['interpreter', 'patient'] },
  ]
}
