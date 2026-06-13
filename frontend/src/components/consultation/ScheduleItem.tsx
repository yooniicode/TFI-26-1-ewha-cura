'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Gender } from '@/lib/types'

interface ScheduleItemProps {
  time: string
  patientName: string
  gender?: Gender
  locationLabel: string
  active: boolean
  /** 카드 클릭 — 환자/진료 상세로 이동 */
  cardHref?: string
  onCardClick?: () => void
  /** 실시간 메모 작성 버튼 (active 상태에서만 표시) */
  memoHref?: string
  onMemoClick?: () => void
  className?: string
}

const GENDER_BG: Partial<Record<Gender, string>> = {
  MALE: '#dbeafe',
  FEMALE: '#fff2f7',
}
const GENDER_ICON: Partial<Record<Gender, string>> = {
  MALE: '/icons/성별-남자.svg',
  FEMALE: '/icons/성별-여자.svg',
}

function GenderBadge({ gender }: { gender: Gender }) {
  const bg = GENDER_BG[gender]
  const icon = GENDER_ICON[gender]
  if (!icon) return null
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full size-[20px] overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      <Image src={icon} alt={gender} width={12} height={12} />
    </div>
  )
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

export default function ScheduleItem({
  time,
  patientName,
  gender,
  locationLabel,
  active,
  cardHref,
  onCardClick,
  memoHref,
  onMemoClick,
  className = '',
}: ScheduleItemProps) {
  const cardInner = (
    <>
      {/* 환자 정보 + 화살표 행 */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className={`text-[18px] font-semibold whitespace-nowrap ${active ? 'text-[#161616]' : 'text-[#808080]'}`}>
              {patientName}
            </p>
            {gender && <GenderBadge gender={gender} />}
          </div>
          <p className={`text-[16px] w-[199px] ${active ? 'text-[#494949]' : 'text-[#808080]'}`}>
            {locationLabel}
          </p>
        </div>
        <ChevronRight />
      </div>

      {/* 실시간 메모 버튼 — active 전용 */}
      {active && (
        memoHref ? (
          <Link
            href={memoHref}
            className="flex w-full items-center justify-center gap-1 rounded-[8px] bg-white px-5 py-4"
          >
            <Image src="/icons/RM작성.svg" alt="" width={20} height={20} />
            <span className="text-[14px] font-medium text-[#2592ff] whitespace-nowrap">실시간 메모 작성</span>
          </Link>
        ) : onMemoClick ? (
          <button
            type="button"
            onClick={onMemoClick}
            className="flex w-full items-center justify-center gap-1 rounded-[8px] bg-white px-5 py-4 transition-opacity active:opacity-70"
          >
            <Image src="/icons/RM작성.svg" alt="" width={20} height={20} />
            <span className="text-[14px] font-medium text-[#2592ff] whitespace-nowrap">실시간 메모 작성</span>
          </button>
        ) : null
      )}
    </>
  )

  const cardCls = active
    ? 'min-w-0 flex-1 overflow-hidden rounded-[8px] bg-[#f3f9ff] p-5 flex flex-col gap-[15px]'
    : 'min-w-0 flex-1 overflow-hidden rounded-[16px] bg-[#f7f7f7] border border-[#eee] px-4 py-5 flex items-center'

  const cardNode = cardHref ? (
    <Link href={cardHref} className={cardCls}>
      {cardInner}
    </Link>
  ) : onCardClick ? (
    <button type="button" onClick={onCardClick} className={`${cardCls} transition-opacity active:opacity-70`}>
      {cardInner}
    </button>
  ) : (
    <div className={cardCls}>{cardInner}</div>
  )

  return (
    <div className={`flex ${active ? 'items-start' : 'items-center'} ${className}`}>
      {/* 시간 컬럼 */}
      <div className="w-16 shrink-0 py-5 text-center">
        <span className={`text-[16px] font-medium ${active ? 'text-[#2592ff]' : 'text-[#808080]'}`}>
          {time}
        </span>
      </div>
      {/* 카드 */}
      {cardNode}
    </div>
  )
}
