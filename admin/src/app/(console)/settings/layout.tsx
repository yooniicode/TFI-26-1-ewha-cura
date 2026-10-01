'use client'

import { usePathname } from 'next/navigation'
import SettingsFrame, { SETTINGS_TABS } from './SettingsFrame'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const current = SETTINGS_TABS.find(t => pathname.startsWith(t.href))?.value ?? 'center'
  return <SettingsFrame current={current}>{children}</SettingsFrame>
}
