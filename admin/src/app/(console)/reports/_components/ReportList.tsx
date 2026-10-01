import clsx from 'clsx'
import StatusBadge from '@/components/ui/StatusBadge'
import { REPORT_STATUS_BADGE, formatDateTime, languageLabel, nationalityLanguageCode } from '@/lib/labels'
import type { ReportItem } from '@/lib/schemas'

/** Figma: 보고서 › 2) List — 선택한 보고서는 파란 배경 */
export default function ReportList({ items, selectedId, onSelect }: {
  items: ReportItem[]
  selectedId: string | null
  onSelect: (item: ReportItem) => void
}) {
  return (
    <ul className="flex w-full flex-col">
      {items.map(item => {
        const selected = item.consultationId === selectedId
        return (
          <li key={item.consultationId}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-current={selected ? 'true' : undefined}
              className={clsx(
                'flex w-full items-center justify-between gap-3 px-5 py-4 text-left',
                selected ? 'bg-brand-blue-bg' : 'bg-white hover:bg-surface-muted',
              )}
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className={clsx('truncate text-[18px] font-semibold', selected ? 'text-ink' : 'text-ink-grey')}>
                  {item.interpreterName ?? '통번역가'} 통역가
                </span>
                <span className={clsx('truncate text-[15px] font-medium', selected ? 'text-ink-grey' : 'text-ink-grey2')}>
                  {item.patientName ?? '-'} · {languageLabel(nationalityLanguageCode(item.patientNationality))}
                </span>
                <span className={clsx('truncate text-[15px] font-medium', selected ? 'text-modal-label' : 'text-ink-grey2')}>
                  {item.hospitalName ?? '-'} · {formatDateTime(item.consultationDate)}
                </span>
              </span>
              <StatusBadge status={REPORT_STATUS_BADGE[item.reportStatus]} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
