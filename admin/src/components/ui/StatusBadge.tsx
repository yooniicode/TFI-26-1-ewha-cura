import clsx from 'clsx'

/**
 * Figma: 컴포넌트관리 › Component 4 (매칭 상태 뱃지)
 *        보고서 › Component 8 (보고서 상태 뱃지)
 */
export type StatusBadgeStatus =
  | 'needs_assignment'    // 배정 필요
  | 'needs_reassignment'  // 재배정 필요
  | 'awaiting_acceptance' // 수락 대기
  | 'assigned'            // 배정 완료
  | 'completed'           // 진료 완료
  | 'report_pending'      // 승인 필요
  | 'report_approved'     // 승인
  | 'report_rejected'     // 반려

const STYLES: Record<StatusBadgeStatus, { label: string; className: string }> = {
  needs_assignment:    { label: '배정 필요',   className: 'bg-status-orange-bg text-status-orange' },
  needs_reassignment:  { label: '재배정 필요', className: 'bg-status-red-bg text-status-red' },
  awaiting_acceptance: { label: '수락 대기',   className: 'bg-status-sky-bg text-status-sky' },
  assigned:            { label: '배정 완료',   className: 'bg-status-teal-bg text-status-teal' },
  completed:           { label: '진료 완료',   className: 'bg-status-indigo-bg text-status-indigo' },
  report_pending:      { label: '승인 필요',   className: 'bg-status-orange-bg text-status-orange' },
  report_approved:     { label: '승인',        className: 'bg-status-indigo-bg text-status-indigo' },
  report_rejected:     { label: '반려',        className: 'bg-status-red-bg text-status-red' },
}

export default function StatusBadge({ status, className }: { status: StatusBadgeStatus; className?: string }) {
  const style = STYLES[status]
  return (
    <span
      className={clsx(
        'inline-flex h-7 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-[12px] px-[10px] py-1 text-[14px] font-semibold',
        style.className,
        className,
      )}
    >
      {style.label}
    </span>
  )
}
