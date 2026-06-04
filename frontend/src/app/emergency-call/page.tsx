'use client'

import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function EmergencyCallPage() {
  const { t } = useTranslation()

  const EMERGENCY_NUMBERS = [
    { labelKey: 'emergency_fire' as const, descKey: 'emergency_fire_desc' as const, number: '119', color: '#FF3B30', bg: '#FFF1F0' },
    { labelKey: 'police' as const, descKey: 'police_desc' as const, number: '112', color: '#0057FF', bg: '#EEF3FF' },
    { labelKey: 'medical_info' as const, descKey: 'medical_info_desc' as const, number: '1339', color: '#2592FF', bg: '#F0F8FF' },
    { labelKey: 'danuri' as const, descKey: 'danuri_desc' as const, number: '1577-1366', color: '#FF6B9D', bg: '#FFF0F6' },
    { labelKey: 'immigration' as const, descKey: 'immigration_desc' as const, number: '1345', color: '#34C759', bg: '#F0FFF4' },
  ]

  return (
    <AppShell noPadding>
      <PageHeader title={t.emergency.title} />

      <div className="bg-[#F5F5F5] px-4 py-5 min-h-screen space-y-3">
        <p className="text-sm text-[#808080] pb-1">{t.emergency.subtitle}</p>

        {EMERGENCY_NUMBERS.map(item => (
          <a
            key={item.number}
            href={`tel:${item.number.replace(/-/g, '')}`}
            className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm hover:shadow-md active:opacity-80 transition-all"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: item.bg }}
            >
              <img
                src="/icons/immigrant/home/긴급전화.svg"
                alt=""
                width={22}
                height={22}
                style={{ filter: 'brightness(0)', opacity: 0.7 }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[#161616]">{t.emergency[item.labelKey]}</p>
              <p className="text-sm text-[#808080] mt-0.5 leading-snug">{t.emergency[item.descKey]}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.number}</p>
            </div>
          </a>
        ))}

        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">{t.emergency.warning_title}</p>
          <p className="text-xs text-amber-700 leading-relaxed">{t.emergency.warning_desc}</p>
        </div>
      </div>
    </AppShell>
  )
}
