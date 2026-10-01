import clsx from 'clsx'

/** Figma: 매칭관리 › Candidate (통번역가 한 줄, 60px) */
export default function CandidateCard({ name, sub, note, selected, onSelect, showSelectedButton }: {
  name: string
  sub: string
  note?: string
  /** 선택(강조) 상태 — 파란 배경 · 진한 글씨 */
  selected: boolean
  /** 있으면 클릭으로 선택하는 버튼이 된다 */
  onSelect?: () => void
  /** 배정하기 모달: 오른쪽 "✓ 선택됨" 자리 */
  showSelectedButton?: boolean
}) {
  const content = (
    <>
      <span className="flex w-[280px] shrink-0 items-center gap-3">
        <img src="/icons/avatar-default.svg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full bg-white" />
        <span className={clsx('flex min-w-0 flex-col gap-1 text-left', !selected && 'text-ink-grey2')}>
          <span className={clsx('truncate text-[15px] font-semibold', selected && 'text-modal-title')}>{name}</span>
          <span className={clsx('truncate text-[13px] font-medium', selected && 'text-ink')}>{sub}</span>
        </span>
      </span>
      {note && (
        <span className={clsx('ml-auto whitespace-nowrap text-[13px] font-medium', selected ? 'text-brand-blue' : 'text-ink-grey2')}>
          {note}
        </span>
      )}
      {showSelectedButton && (
        <span
          aria-hidden={!selected}
          className={clsx(
            'ml-[14px] flex h-[30px] shrink-0 items-center justify-center rounded-[8px] bg-brand-blue px-3 py-1.5 text-[12px] font-semibold text-white',
            !selected && 'invisible',
          )}
        >
          ✓ 선택됨
        </span>
      )}
    </>
  )

  const className = clsx(
    'flex h-[60px] w-full shrink-0 items-center rounded-[12px] px-4 py-[10px]',
    selected && 'bg-brand-blue-bg',
  )

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className={clsx(className, !selected && 'hover:bg-surface-muted')}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}
