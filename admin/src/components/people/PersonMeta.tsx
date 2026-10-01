import clsx from 'clsx'
import { GENDER_ICONS, genderLabel, nationalityFlag, nationalityLabel } from '@/lib/labels'

/** 아이콘 + 글자 한 줄. iconAfter 면 상세 모달처럼 글자 뒤에 아이콘을 둔다. */
function IconText({ icon, text, iconAfter, flag, className }: {
  icon: string | null
  text: string
  iconAfter?: boolean
  /** Figma flag_XX: 18px 칸 가운데 13.5 × 9.64 국기 */
  flag?: boolean
  className?: string
}) {
  const img = icon && (flag ? (
    <span className="flex size-[18px] shrink-0 items-center justify-center">
      <img src={icon} alt="" width={13.5} height={9.643} />
    </span>
  ) : (
    <img src={icon} alt="" width={18} height={18} className="size-[18px] shrink-0" />
  ))
  return (
    <span className={clsx('flex items-center gap-1 whitespace-nowrap text-[14px]', className)}>
      {!iconAfter && img}
      <span className="truncate">{text}</span>
      {iconAfter && img}
    </span>
  )
}

/** 국기 에셋이 없는 국적은 국가명만 보여준다 */
export function NationalityText({ value, iconAfter, className }: { value?: string | null; iconAfter?: boolean; className?: string }) {
  return <IconText icon={nationalityFlag(value)} text={nationalityLabel(value)} iconAfter={iconAfter} flag className={className} />
}

export function GenderText({ value, iconAfter, className }: { value?: string | null; iconAfter?: boolean; className?: string }) {
  return <IconText icon={value ? GENDER_ICONS[value] ?? null : null} text={genderLabel(value)} iconAfter={iconAfter} className={className} />
}

export function PhoneText({ value, className }: { value?: string | null; className?: string }) {
  return <IconText icon="/icons/phone.svg" text={value || '-'} className={className} />
}
