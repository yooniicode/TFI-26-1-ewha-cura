'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export type PeriodPreset = 'today' | 'week' | 'month' | 'all' | 'custom'

export interface Period {
  preset: PeriodPreset
  /** YYYY-MM-DD */
  from?: string
  to?: string
}

const PRESETS: { value: Exclude<PeriodPreset, 'custom'>; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'week',  label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: 'all',   label: '전체 기간' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 프리셋 → 조회 기간 (이번 주는 월요일 시작) */
export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, now = new Date()): Period {
  if (preset === 'all') return { preset }
  if (preset === 'today') return { preset, from: toIso(now), to: toIso(now) }
  if (preset === 'week') {
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { preset, from: toIso(monday), to: toIso(sunday) }
  }
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { preset, from: toIso(first), to: toIso(last) }
}

function periodLabel(period: Period) {
  if (period.preset === 'custom') return `${period.from} ~ ${period.to}`
  return PRESETS.find(p => p.value === period.preset)?.label ?? '기간'
}

/**
 * YYYY-MM-DD 로 보이는 날짜 칸. 브라우저 기본 date input 은 로케일마다 표기가 달라
 * 좁은 칸에서 잘리므로, 숨긴 date input 의 달력만 빌려 쓴다.
 */
function DateField({ label, value, min, max, onChange }: {
  label: string
  value?: string
  min?: string
  max?: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <label className="relative h-8 min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        type="date"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={e => e.target.value && onChange(e.target.value)}
        onClick={() => inputRef.current?.showPicker?.()}
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className="pointer-events-none flex h-full items-center justify-center rounded-[6px] border border-line-input bg-period-input-bg px-[10px] py-[7px] text-[12px] font-medium text-period-input-text peer-focus-visible:border-brand-blue/40"
      >
        {value || 'YYYY-MM-DD'}
      </span>
    </label>
  )
}

/** Figma: 보고서 › 1-2 기간 필터링 (dropdown-panel 240px) */
export default function PeriodDropdown({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Period>(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(value.preset === 'all' ? { ...value, ...presetPeriod('month'), preset: 'all' } : value)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function pick(preset: Exclude<PeriodPreset, 'custom'>) {
    onChange(presetPeriod(preset))
    setOpen(false)
  }

  const customValid = !!draft.from && !!draft.to && draft.from <= draft.to
  function applyCustom() {
    if (!customValid) return
    onChange({ preset: 'custom', from: draft.from, to: draft.to })
    setOpen(false)
  }

  const active = value.preset !== 'all'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx(
          'flex h-10 items-center justify-center gap-0.5 rounded-[8px] border px-[14px] py-[10px] text-[14px] font-medium',
          active ? 'border-brand-blue/20 bg-chip-bg text-chip-text' : 'bg-white text-ink-grey2',
          !active && (open ? 'border-brand-blue/20' : 'border-line'),
        )}
      >
        {active ? periodLabel(value) : '기간'}
        <img src="/icons/chevron-down-18.svg" alt="" width={18} height={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="기간 선택"
          className="absolute right-0 top-[48px] z-30 flex w-[240px] flex-col items-center gap-4 rounded-[12px] border border-line bg-white p-[10px]"
        >
          <ul className="flex w-full flex-col gap-0.5">
            {PRESETS.map(p => (
              <li key={p.value}>
                <button
                  type="button"
                  onClick={() => pick(p.value)}
                  className={clsx(
                    'flex h-9 w-full items-center rounded-[6px] px-[10px] py-2 text-[14px] font-medium',
                    value.preset === p.value ? 'bg-chip-bg text-brand-blue' : 'text-ink-grey2 hover:bg-surface-muted',
                  )}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="h-px w-full bg-period-divider" />

          <div className="flex w-full flex-col gap-2">
            <p className="text-[12px] font-medium text-period-label">직접 설정</p>
            <div className="flex w-full items-center gap-1.5">
              <DateField
                label="시작일"
                value={draft.from}
                max={draft.to}
                onChange={from => setDraft(d => ({ ...d, from }))}
              />
              <img src="/icons/line-8.svg" alt="" width={8} height={1} />
              <DateField
                label="종료일"
                value={draft.to}
                min={draft.from}
                onChange={to => setDraft(d => ({ ...d, to }))}
              />
            </div>
          </div>

          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customValid}
              className="flex h-[30px] w-[60px] items-center justify-center rounded-[7px] bg-brand-blue px-[14px] py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
