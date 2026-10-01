import Link from 'next/link'
import clsx from 'clsx'

export interface PillTab<T extends string> {
  value: T
  label: string
  /** 있으면 링크 탭 (환경설정처럼 하위 경로로 나뉠 때) */
  href?: string
}

const tabClass = (active: boolean) => clsx(
  'flex h-9 items-center justify-center rounded-[18px] px-4 py-2 text-[14px]',
  active ? 'bg-brand-blue font-semibold text-white' : 'bg-white font-medium text-ink-grey2 hover:bg-surface-muted',
)

/** Figma: 보고서 › Status Tabs — 알약 모양 탭 */
export default function PillTabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: PillTab<T>[]
  value: T
  onChange?: (value: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex min-h-9 flex-wrap items-center gap-2">
      {tabs.map(tab => tab.href ? (
        <Link key={tab.value} href={tab.href} role="tab" aria-selected={value === tab.value} className={tabClass(value === tab.value)}>
          {tab.label}
        </Link>
      ) : (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange?.(tab.value)}
          className={tabClass(value === tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
