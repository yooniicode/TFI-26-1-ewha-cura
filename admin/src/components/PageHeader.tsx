/** Figma 공통 페이지 헤더 — 제목 26 SemiBold + 설명 14 Medium */
export default function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <h1 className="text-[26px] font-semibold text-ink">{title}</h1>
      <p className="text-[14px] font-medium text-modal-sub">{subtitle}</p>
    </header>
  )
}
