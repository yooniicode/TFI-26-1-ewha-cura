import { GenderText, NationalityText, PhoneText } from './PersonMeta'

/** Figma: 이주민 관리 › Card-이주민 / 통번역가 관리 › Card-통번역가 (306 × 150) */
export default function PersonCard({ name, badge, nationality, gender, phone, onClick }: {
  name: string
  badge: React.ReactNode
  nationality?: string | null
  gender?: string | null
  phone?: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[150px] w-full flex-col items-start justify-between overflow-hidden rounded-[14px] border border-[#E5E8ED] bg-white p-5 text-left text-ink-grey transition-colors hover:border-brand-blue/40"
    >
      <span className="flex h-7 w-full items-center justify-between gap-2">
        <span className="truncate text-[17px] font-semibold text-modal-title">{name}</span>
        {badge}
      </span>
      <NationalityText value={nationality} />
      <GenderText value={gender} />
      <PhoneText value={phone} />
    </button>
  )
}
