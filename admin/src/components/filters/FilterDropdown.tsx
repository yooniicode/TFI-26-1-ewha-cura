'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export interface FilterOption<T extends string> {
  value: T
  label: string
  /** 드롭다운 항목을 글자 대신 그릴 때 (예: 상태 뱃지) */
  render?: React.ReactNode
}

/**
 * Figma: 매칭관리 · 보고서 › Toolbar 필터 (언어 · 상태)
 * - 선택 전: "언어 ⌄" 트리거
 * - 선택 후: 트리거 대신 선택값 칩(× 로 해제). 칩을 누르면 드롭다운을 다시 열어 추가 선택.
 */
export default function FilterDropdown<T extends string>({ label, options, selected, onChange }: {
  label: string
  options: FilterOption<T>[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const remaining = options.filter(o => !selected.includes(o.value))

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function select(value: T) {
    onChange([...selected, value])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {selected.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={clsx(
            'flex h-10 items-center justify-center gap-0.5 rounded-[8px] border bg-white px-[14px] py-[10px] text-[14px] font-medium text-ink-grey2',
            open ? 'border-brand-blue/20' : 'border-line',
          )}
        >
          {label}
          <img src="/icons/chevron-down-18.svg" alt="" width={18} height={18} />
        </button>
      ) : (
        selected.map(value => {
          const option = options.find(o => o.value === value)
          return (
            <span
              key={value}
              className="flex h-10 items-center justify-center gap-0.5 rounded-[8px] border border-brand-blue/20 bg-chip-bg px-[14px] py-[10px] text-[14px] font-medium text-chip-text"
            >
              <button
                type="button"
                onClick={() => remaining.length > 0 && setOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                title={remaining.length > 0 ? `${label} 추가` : undefined}
              >
                {option?.label ?? value}
              </button>
              <button
                type="button"
                onClick={() => onChange(selected.filter(v => v !== value))}
                aria-label={`${option?.label ?? value} 필터 해제`}
              >
                <img src="/icons/close-18.svg" alt="" width={18} height={18} />
              </button>
            </span>
          )
        })
      )}

      {open && remaining.length > 0 && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-[46px] z-30 flex max-h-[239px] w-[180px] flex-col gap-[14px] overflow-y-auto rounded-[12px] border border-line bg-white p-[14px]"
        >
          {remaining.map((option, i) => (
            <Fragment key={option.value}>
              {i > 0 && <li aria-hidden className="border-t border-line" />}
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => select(option.value)}
                  className="w-full text-left text-[14px] font-medium text-ink-grey2 hover:text-ink"
                >
                  {option.render ?? option.label}
                </button>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  )
}
