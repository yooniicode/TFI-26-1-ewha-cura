import Link from 'next/link'
import clsx from 'clsx'
import MaskIcon from './MaskIcon'

export interface NavIconSpec {
  src: string
  flip?: boolean
  rotate?: boolean
}

interface Props {
  label: string
  icon: NavIconSpec
  active?: boolean
  /** 접힌 사이드바: 아이콘만 표시 */
  collapsed?: boolean
  /** 있으면 링크, 없으면 버튼 */
  href?: string
  onClick?: () => void
  /** 버튼일 때 추가 속성 (aria-expanded, data-* 등) */
  attrs?: Record<string, string | boolean | undefined>
}

/** Figma: 컴포넌트관리 › 메뉴 컴포넌트 (default / active) */
export default function NavItem({ label, icon, active, collapsed, href, onClick, attrs }: Props) {
  const className = clsx(
    'flex h-10 w-fit items-center gap-[10px] rounded-[12px] px-3 py-[10px] text-[15px] transition-colors',
    active
      ? 'bg-surface-nav-active font-semibold text-brand-blue'
      : 'font-medium text-ink-grey2 hover:bg-brand-blue-bg',
  )
  const content = (
    <>
      <MaskIcon src={icon.src} flip={icon.flip} rotate={icon.rotate} />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </>
  )
  const title = collapsed ? label : undefined

  if (href) {
    return (
      <Link href={href} className={className} title={title} aria-current={active ? 'page' : undefined}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className} title={title} {...attrs}>
      {content}
    </button>
  )
}
