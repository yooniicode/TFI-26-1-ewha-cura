import clsx from 'clsx'
import { GENDER_ICONS, genderLabel, nationalityFlag, nationalityLabel } from '@/lib/labels'

/** 아이콘 + 글자 한 줄. iconAfter 면 상세 모달처럼 글자 뒤에 아이콘을 둔다. */
function IconText({ icon, text, iconAfter, flag, className }: {
  icon: string | null
  text: string
  iconAfter?: boolean
  /**
   * Figma flag_XX: 정사각 칸 가운데 국기. 18px 칸에서는 국기를 0.75배(높이 9.64)로 줄여 쓴다.
   * 네팔처럼 비율이 다른 국기도 있어 높이만 고정하고 너비는 원본 비율을 따른다.
   */
  flag?: boolean
  className?: string
}) {
  // 국기가 없는 국적(기타)도 다른 줄과 글자 시작점이 맞도록 빈 칸을 둔다
  const img = flag && !icon ? <span aria-hidden className="size-[18px] shrink-0" /> : icon && (flag ? (
    <span className="flex size-[18px] shrink-0 items-center justify-center">
      <img src={icon} alt="" height={9.643} className="h-[9.643px] w-auto" />
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
