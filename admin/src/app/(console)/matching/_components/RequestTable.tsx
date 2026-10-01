import ActionButton from '@/components/ui/ActionButton'
import StatusBadge from '@/components/ui/StatusBadge'
import { DISPLAY_STATUS_BADGE, formatDateTime, languageLabel } from '@/lib/labels'
import type { MatchingRequest } from '@/lib/schemas'

/** 배정이 필요한 상태는 "배정하기", 그 외는 "상세보기" */
export function needsAssignment(item: MatchingRequest) {
  return item.displayStatus === 'NEEDS_ASSIGNMENT' || item.displayStatus === 'NEEDS_REASSIGNMENT'
}

const cell = 'shrink-0 truncate text-center'

/** Figma: 매칭관리 › 2) 표 (최대 9행, 요청순 최신순) */
export default function RequestTable({ items, onOpen }: {
  items: MatchingRequest[]
  onOpen: (item: MatchingRequest) => void
}) {
  return (
    <div className="w-full overflow-hidden rounded-[14px] border border-line bg-white">
      <div role="row" className="flex h-11 items-center justify-between bg-brand-blue-bg px-6 py-[14px] text-[13px] font-semibold text-ink-grey2">
        <span className="w-[100px] shrink-0">환자 이름</span>
        <span className={`${cell} w-[100px]`}>증상</span>
        <span className={`${cell} w-[130px]`}>요청 언어</span>
        <span className={`${cell} w-[170px]`}>요청일시</span>
        <span className={`${cell} w-[90px]`}>상태</span>
        <span className={`${cell} w-[130px]`}>통번역가</span>
        <span className={`${cell} w-[120px]`}>배정 내역</span>
      </div>
      <ul>
        {items.map(item => (
          <li key={item.consultationId} className="flex h-16 items-center justify-between bg-white px-6 py-[14px] text-[14px]">
            <span className="w-[100px] shrink-0 truncate font-semibold text-table-name">{item.patientName ?? '-'}</span>
            <span className={`${cell} w-[100px] text-ink-grey`} title={item.symptom ?? undefined}>{item.symptom || '-'}</span>
            <span className={`${cell} w-[130px] text-ink-grey`}>{languageLabel(item.patientLanguageCode)}</span>
            <span className={`${cell} w-[170px] text-ink-grey`}>{formatDateTime(item.requestedAt)}</span>
            <span className="flex w-[90px] shrink-0 justify-center">
              {item.displayStatus && <StatusBadge status={DISPLAY_STATUS_BADGE[item.displayStatus]} />}
            </span>
            <span className={`${cell} w-[130px] font-semibold text-table-name`}>{item.interpreterName ?? '-'}</span>
            <span className="flex w-[120px] shrink-0 justify-center">
              {needsAssignment(item)
                ? <ActionButton onClick={() => onOpen(item)}>배정하기</ActionButton>
                : <ActionButton variant="soft" onClick={() => onOpen(item)}>상세보기</ActionButton>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
