import clsx from 'clsx'

/**
 * Figma: 이주민 관리 · 통번역가 관리 › badge-진료횟수 (기본 / 신규)
 * count 가 0이면 신규 뱃지.
 */
export default function CountBadge({ count, unit, newLabel }: {
  count: number
  /** "진료" → "진료 3회", "통번역" → "통번역 3회" */
  unit: string
  /** 이주민 "신규 등록", 통번역가 "신규" */
  newLabel: string
}) {
  const isNew = count === 0
  return (
    <span
      className={clsx(
        'inline-flex h-[26px] shrink-0 items-center justify-center whitespace-nowrap rounded-[12px] px-[10px] py-[5px] text-[12px]',
        isNew ? 'bg-brand-blue-bg font-semibold text-brand-blue' : 'bg-button-bluegrey font-medium text-ink-grey2',
      )}
    >
      {isNew ? newLabel : `${unit} ${count}회`}
    </span>
  )
}
