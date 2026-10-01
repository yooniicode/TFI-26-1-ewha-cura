import clsx from 'clsx'

/** 현재 페이지를 가운데에 두고 최대 `size`개 페이지 번호를 고른다 (0-based) */
function pageWindow(page: number, totalPages: number, size: number) {
  const count = Math.min(size, totalPages)
  const start = Math.min(Math.max(0, page - Math.floor(count / 2)), totalPages - count)
  return Array.from({ length: count }, (_, i) => start + i)
}

/**
 * Figma: 컴포넌트관리 › Pagination
 * 1페이지일 때 이전 버튼 비활성화, 2페이지부터 활성화. page 는 백엔드 pageInfo 와 같은 0-based.
 */
export default function Pagination({ page, totalPages, onChange, windowSize = 5, className }: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  windowSize?: number
  className?: string
}) {
  if (totalPages <= 0) return null

  const isFirst = page <= 0
  const isLast = page >= totalPages - 1

  return (
    <nav aria-label="페이지 이동" className={clsx('flex items-center justify-center gap-4', className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={isFirst}
        aria-label="이전 페이지"
        className="flex h-8 items-center justify-center rounded-[8px] bg-surface-muted px-3 py-[7px] enabled:hover:bg-[#EDEDED]"
      >
        <img src={isFirst ? '/icons/chevron-left-disabled.svg' : '/icons/chevron-left.svg'} alt="" width={16} height={16} />
      </button>

      <ol className="flex items-center gap-2">
        {pageWindow(page, totalPages, windowSize).map(p => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={clsx(
                'flex size-8 items-center justify-center rounded-[8px] text-[13px]',
                p === page
                  ? 'bg-brand-blue font-bold text-white'
                  : 'border border-line-input bg-white font-medium text-pagination-text hover:bg-surface-muted',
              )}
            >
              {p + 1}
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={isLast}
        aria-label="다음 페이지"
        className="flex h-8 items-center justify-center rounded-[8px] bg-surface-muted px-3 py-[7px] enabled:hover:bg-[#EDEDED]"
      >
        {/* 다음-비활성 에셋이 없어 이전-비활성과 같은 30% 불투명도로 표현 */}
        <img src="/icons/chevron-right.svg" alt="" width={16} height={16} className={clsx(isLast && 'opacity-30')} />
      </button>
    </nav>
  )
}
