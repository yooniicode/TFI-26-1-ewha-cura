'use client'

import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13.6a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10.91a16 16 0 006.72 6.72l1.25-1.25a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 18.92v-2z" />
  </svg>
)

export default function EmergencyCallPage() {
  const { t } = useTranslation()

  const EMERGENCY_NUMBERS = [
    { labelKey: 'emergency_fire' as const, descKey: 'emergency_fire_desc' as const, number: '119', hours: '24시간' },
    { labelKey: 'police' as const, descKey: 'police_desc' as const, number: '112', hours: '24시간' },
    { labelKey: 'medical_info' as const, descKey: 'medical_info_desc' as const, number: '1339', hours: '24시간' },
    { labelKey: 'danuri' as const, descKey: 'danuri_desc' as const, number: '1577-1366', hours: '24시간' },
    { labelKey: 'immigration' as const, descKey: 'immigration_desc' as const, number: '1345', hours: '평일 09:00~22:00' },
    { labelKey: 'nhis' as const, descKey: 'nhis_desc' as const, number: '033-811-2000', hours: '평일 09:00~18:00', url: 'https://www.nhis.or.kr/vietnamese/index.do' },
  ]

  return (
    <AppShell noPadding>
      <PageHeader title={t.emergency.title} />

      <div className="bg-white px-4 pt-2">
        {EMERGENCY_NUMBERS.map((item, index) => (
          <div
            key={item.number}
            className={`py-4${index < EMERGENCY_NUMBERS.length - 1 ? ' border-b border-[#eee]' : ''}`}
          >
            <a
              href={`tel:${item.number.replace(/-/g, '')}`}
              className="flex items-center justify-between active:opacity-60 transition-opacity"
            >
              <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-4">
                <p className="text-[18px] font-semibold text-[#161616] leading-[1.4]">
                  {t.emergency[item.labelKey]}
                </p>
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">
                  {t.emergency[item.descKey]}
                </p>
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">
                  {item.hours}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-[20px] font-semibold text-[#2592ff]">{item.number}</p>
                <div className="w-8 h-8 rounded-full bg-[#f0f1f5] flex items-center justify-center shrink-0">
                  <PhoneIcon />
                </div>
              </div>
            </a>
            {'url' in item && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-[13px] font-medium text-[#2592ff] underline underline-offset-2 active:opacity-60 transition-opacity"
                onClick={e => e.stopPropagation()}
              >
                웹사이트 바로가기 →
              </a>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
