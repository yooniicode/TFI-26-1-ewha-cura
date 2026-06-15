'use client'

import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/I18nContext'

export const NATIONALITY_FLAG: Partial<Record<string, string>> = {
  KOREA:         '/icons/common/flag/flag_KR.svg',
  UNITED_STATES: '/icons/common/flag/flag_US.svg',
  VIETNAM:       '/icons/common/flag/flag_VN.svg',
  CHINA:         '/icons/common/flag/flag_CN.svg',
  CAMBODIA:      '/icons/common/flag/flag_KH.svg',
  MYANMAR:       '/icons/common/flag/flag_MM.svg',
  THAILAND:      '/icons/common/flag/flag_TH.svg',
  NEPAL:         '/icons/common/flag/flag_NP.svg',
  MONGOLIA:      '/icons/common/flag/flag_MN.svg',
  UZBEKISTAN:    '/icons/common/flag/flag_UZ.svg',
  SRI_LANKA:     '/icons/common/flag/flag_LK.svg',
  BANGLADESH:    '/icons/common/flag/flag_BD.svg',
  PAKISTAN:      '/icons/common/flag/flag_PK.svg',
}

export function getFlagSrc(nationality?: string | null): string | undefined {
  if (!nationality) return undefined
  return NATIONALITY_FLAG[nationality]
}

interface PatientInfoBarProps {
  patientId?: string | null
  patientName: string
  subtitle?: string
  flagSrc?: string | null
}

export default function PatientInfoBar({ patientId, patientName, subtitle, flagSrc }: PatientInfoBarProps) {
  const { t } = useTranslation()

  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#DEE2FF] flex items-center justify-center text-base font-semibold text-indigo-700">
            {patientName ? patientName.charAt(0) : '?'}
          </div>
          {flagSrc && (
            <img
              src={flagSrc}
              alt=""
              width={16}
              height={16}
              className="absolute -bottom-0.5 -right-0.5"
            />
          )}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[#161616] text-base font-semibold truncate">
            {patientName || t.consultation.patient_placeholder}
          </span>
          {subtitle && (
            <span className="text-[#808080] text-sm truncate">{subtitle}</span>
          )}
        </div>
      </div>
      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
        <path d="M1 1l6 6-6 6" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  )

  const baseClass = 'bg-white px-5 py-4 border-b border-[#F6F6F6] flex items-center justify-between'

  if (patientId) {
    return (
      <Link href={`/patients/${patientId}`} className={`${baseClass} hover:bg-gray-50 transition-colors`}>
        {inner}
      </Link>
    )
  }
  return <div className={baseClass}>{inner}</div>
}
