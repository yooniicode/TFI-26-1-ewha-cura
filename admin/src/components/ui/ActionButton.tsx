import clsx from 'clsx'

/** Figma: 컴포넌트관리 › action-cell (배정하기 / 상세보기) */
type Variant = 'primary' | 'soft'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-brand-blue text-white hover:bg-[#1a7ee6]',
  soft:    'bg-brand-blue-bg text-brand-blue hover:bg-surface-nav-active',
}

export default function ActionButton({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex h-8 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] px-[14px] py-[7px] text-[13px] font-semibold transition-colors disabled:opacity-40',
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  )
}
