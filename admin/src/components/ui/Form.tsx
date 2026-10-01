import clsx from 'clsx'

/** 설정 화면 카드 — 표·패널과 같은 테두리(#EEE)와 모서리(14px) */
export function Card({ title, description, children, className, actions }: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
}) {
  return (
    <section className={clsx('flex flex-col gap-6 rounded-[14px] border border-line bg-white p-7', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] font-semibold text-modal-title">{title}</h2>
          {description && <p className="text-[13px] font-medium text-modal-sub">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** 라벨 + 입력칸. 라벨은 모달 필드 라벨(12px, #99A1AB)과 같은 스타일 */
export function TextField({ label, hint, className, ...input }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-[12px] font-medium text-modal-label">{label}</span>
      <input
        {...input}
        className="h-11 rounded-[10px] border border-line bg-white px-[14px] text-[14px] font-medium text-ink outline-none placeholder:text-ink-grey2 focus:border-brand-blue/40 disabled:bg-surface-muted disabled:text-ink-grey2"
      />
      {hint && <span className="text-[12px] text-ink-grey2">{hint}</span>}
    </label>
  )
}

/** 읽기 전용 필드 — 모달의 field-label / field-value 와 같은 스타일 */
export function ReadField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-modal-label">{label}</span>
      <span className="truncate text-[14px] font-semibold text-modal-value">{value}</span>
    </div>
  )
}
