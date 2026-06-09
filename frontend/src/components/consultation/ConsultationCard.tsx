'use client'

import Image from 'next/image'
import Link from 'next/link'

export type ConsultationCardVariant = 'rm' | 'chevron' | 'doc-plus'

interface ConsultationCardProps {
  patientName: string
  dateLabel: string
  locationLabel: string
  variant: ConsultationCardVariant
  /** rm variant: 'Rm 작성하기' 버튼 클릭 */
  onRmClick?: () => void
  /** doc-plus variant: 문서+ 아이콘 클릭 */
  onDocPlusClick?: () => void
  /** chevron variant: 카드 전체 href */
  href?: string
  /** chevron variant: 카드 전체 클릭 (href 없을 때) */
  onClick?: () => void
  className?: string
}

function ChevronRight() {
  return (
    <svg
      className="h-6 w-6 shrink-0 text-[#c6c6c6]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function PatientInfo({ patientName, dateLabel, locationLabel }: {
  patientName: string
  dateLabel: string
  locationLabel: string
}) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <p className="text-[20px] font-semibold text-[#161616] whitespace-nowrap">{patientName}</p>
      <p className="text-[16px] text-[#808080] whitespace-nowrap">{dateLabel}</p>
      <p className="text-[16px] text-[#808080] w-[199px]">{locationLabel}</p>
    </div>
  )
}

export default function ConsultationCard({
  patientName,
  dateLabel,
  locationLabel,
  variant,
  onRmClick,
  onDocPlusClick,
  href,
  onClick,
  className = '',
}: ConsultationCardProps) {
  const baseCls = `rounded-[8px] bg-white px-5 py-[22px] ${className}`

  /* ── rm variant ─────────────────────────────── */
  if (variant === 'rm') {
    return (
      <div className={`${baseCls} border border-[#f6f6f6] flex flex-col gap-[15px]`}>
        <div className="flex items-center w-full">
          <PatientInfo patientName={patientName} dateLabel={dateLabel} locationLabel={locationLabel} />
        </div>
        <button
          type="button"
          onClick={onRmClick}
          className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-[#f0f1f5] px-5 py-4 transition-opacity active:opacity-70"
        >
          <Image src="/icons/RM작성.svg" alt="" width={20} height={20} />
          <span className="text-[14px] font-medium text-[#494949] whitespace-nowrap">Rm 작성하기</span>
        </button>
      </div>
    )
  }

  /* ── doc-plus variant ───────────────────────── */
  if (variant === 'doc-plus') {
    return (
      <div className={`${baseCls} flex items-center justify-between`}>
        <PatientInfo patientName={patientName} dateLabel={dateLabel} locationLabel={locationLabel} />
        <button
          type="button"
          onClick={onDocPlusClick}
          className="shrink-0 transition-opacity active:opacity-70"
          aria-label="일정 추가"
        >
          <Image src="/icons/통역일정추가.svg" alt="" width={40} height={40} />
        </button>
      </div>
    )
  }

  /* ── chevron variant ────────────────────────── */
  const innerContent = (
    <>
      <PatientInfo patientName={patientName} dateLabel={dateLabel} locationLabel={locationLabel} />
      <ChevronRight />
    </>
  )
  const chevronCls = `${baseCls} border border-[#f6f6f6] flex items-center justify-between transition-opacity active:opacity-70`

  if (href) {
    return (
      <Link href={href} className={chevronCls}>
        {innerContent}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={chevronCls}>
      {innerContent}
    </button>
  )
}
