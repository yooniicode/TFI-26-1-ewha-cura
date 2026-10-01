'use client'

/** Figma: 매칭관리 · 보고서 › Toolbar › Search Box */
export default function SearchBox({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="flex h-10 w-[240px] items-center gap-2 rounded-[8px] border border-line bg-white px-[14px] py-[10px] focus-within:border-brand-blue/40">
      <img src="/icons/search-16.svg" alt="" width={16} height={16} />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-ink-grey2"
      />
    </label>
  )
}
