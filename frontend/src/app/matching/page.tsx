'use client'

import AppShell from '@/components/AppShell'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function MatchingPage() {
  const { t } = useTranslation()

  return (
    <AppShell>
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400 text-sm">{t.common.coming_soon}</p>
      </div>
    </AppShell>
  )
}
