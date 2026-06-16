'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { parseAppDate } from '@/lib/utils/dateFormat'

export function CalendarPicker({ value, onChange, time, onTimeChange }: {
  value: string; onChange: (v: string) => void
  time?: string; onTimeChange?: (v: string) => void
}) {
  const { t } = useTranslation()
  const today = new Date()
  const [openPicker, setOpenPicker] = useState<'date' | 'time' | null>(null)
  const [viewYear, setViewYear] = useState(() => {
    const d = parseAppDate(value)
    return d ? d.getFullYear() : today.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseAppDate(value)
    return d ? d.getMonth() : today.getMonth()
  })

  const selectedDate = parseAppDate(value)

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

  const cells: Array<{ date: Date; current: boolean }> = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--)
    cells.push({ date: new Date(viewYear, viewMonth - 1, prevMonthDays - i), current: false })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(viewYear, viewMonth, d), current: true })
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), current: false })

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleSelectDate(d: Date) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    onChange(`${y}-${mo}-${day}`)
    setOpenPicker(null)
  }

  const displayDate = value
    ? `${value.slice(2, 4)}.${value.slice(5, 7)}.${value.slice(8, 10)}`
    : null

  const DAYS = t.common.weekdays

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        {/* 날짜 버튼 */}
        <button
          type="button"
          onClick={() => setOpenPicker(p => p === 'date' ? null : 'date')}
          className={`flex items-center gap-2 px-4 py-4 rounded-2xl border w-[180px] transition-colors ${
            openPicker === 'date'
              ? 'border-[#2592FF]'
              : value ? 'border-[#A1A1A1]' : 'border-[#EEEEEE]'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
            <rect x="2.5" y="3.5" width="15" height="14" rx="2.5" stroke="#808080" strokeWidth="1.4"/>
            <path d="M2.5 7.5H17.5" stroke="#808080" strokeWidth="1.4"/>
            <path d="M6.5 1.5V4.5" stroke="#808080" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M13.5 1.5V4.5" stroke="#808080" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className={`text-[18px] font-medium ${value ? 'text-[#161616]' : 'text-[#808080]'}`}>
            {displayDate ?? '날짜'}
          </span>
        </button>

        {/* 시간 버튼 */}
        {onTimeChange && (
          <button
            type="button"
            onClick={() => setOpenPicker(p => p === 'time' ? null : 'time')}
            className={`flex flex-1 items-center gap-2 px-4 py-4 rounded-2xl border transition-colors ${
              openPicker === 'time'
                ? 'border-[#2592FF]'
                : time ? 'border-[#A1A1A1]' : 'border-[#EEEEEE]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
              <circle cx="10" cy="10" r="7.5" stroke="#808080" strokeWidth="1.4"/>
              <path d="M10 6V10L12.5 11.5" stroke="#808080" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`text-[18px] font-medium ${time ? 'text-[#161616]' : 'text-[#808080]'}`}>
              {time ?? '시간'}
            </span>
          </button>
        )}
      </div>

      {/* 달력 인라인 드롭다운 */}
      {openPicker === 'date' && (
        <div className="bg-white border border-[#2592FF] rounded-[20px] p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="w-6 h-6 flex items-center justify-center">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M7 1L1 7L7 13" stroke="#494949" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="text-[16px] font-medium text-[#494949]">{viewYear}년 {viewMonth + 1}월</span>
            <button type="button" onClick={nextMonth} className="w-6 h-6 flex items-center justify-center">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1L7 7L1 13" stroke="#494949" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[12px] text-[#808080] font-medium py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map(({ date, current }, idx) => {
              const isSelected = selectedDate &&
                date.getFullYear() === selectedDate.getFullYear() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getDate() === selectedDate.getDate()
              return (
                <button key={idx} type="button" onClick={() => handleSelectDate(date)}
                  className="flex items-center justify-center py-1">
                  <span className={`w-[30px] h-[30px] flex items-center justify-center rounded-full text-[15px] font-medium ${
                    isSelected ? 'bg-[#f3f9ff] text-[#2592ff]' : !current ? 'text-[#C8C8C8]' : 'text-[#494949]'
                  }`}>
                    {date.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 시간 스크롤 피커 */}
      {openPicker === 'time' && onTimeChange && (
        <TimeScrollPicker
          value={time ?? ''}
          onChange={(v) => { onTimeChange(v); setOpenPicker(null) }}
        />
      )}
    </div>
  )
}

export function TimeScrollPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
  const periods = ['AM', 'PM']

  const initH24 = value ? parseInt(value.split(':')[0]) : 12
  const initH12 = initH24 % 12 === 0 ? 12 : initH24 % 12
  const initPeriod = initH24 >= 12 ? 'PM' : 'AM'

  const [selH, setSelH] = useState(() => String(initH12).padStart(2, '0'))
  const [selM, setSelM] = useState(() => value.split(':')[1] || '00')
  const [selP, setSelP] = useState<'AM' | 'PM'>(() => initPeriod)

  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)
  const ITEM_H = 44

  // 스크롤 settle 후 최신값 읽기용 ref (stale closure 방지)
  const cur = useRef({ h: selH, m: selM, p: selP })
  cur.current = { h: selH, m: selM, p: selP }

  const scrollTimers = useRef<{ h?: ReturnType<typeof setTimeout>; m?: ReturnType<typeof setTimeout>; p?: ReturnType<typeof setTimeout> }>({})
  // 마운트 시 scrollTop 세팅으로 발생하는 scroll 이벤트 무시
  const initialized = useRef(false)

  useEffect(() => {
    const hIdx = hours.indexOf(selH)
    if (hourRef.current && hIdx >= 0) hourRef.current.scrollTop = hIdx * ITEM_H
    const mIdx = minutes.indexOf(selM)
    if (minRef.current && mIdx >= 0) minRef.current.scrollTop = mIdx * ITEM_H
    const pIdx = periods.indexOf(selP)
    if (periodRef.current && pIdx >= 0) periodRef.current.scrollTop = pIdx * ITEM_H
    setTimeout(() => { initialized.current = true }, 200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toH24(h12str: string, period: 'AM' | 'PM') {
    const h12 = parseInt(h12str)
    return period === 'PM' ? (h12 % 12) + 12 : h12 % 12
  }

  function selectHour(h: string) {
    setSelH(h)
    hourRef.current?.scrollTo({ top: hours.indexOf(h) * ITEM_H, behavior: 'smooth' })
  }

  function selectMinute(m: string) {
    setSelM(m)
    minRef.current?.scrollTo({ top: minutes.indexOf(m) * ITEM_H, behavior: 'smooth' })
  }

  function selectPeriod(p: 'AM' | 'PM') {
    setSelP(p)
    periodRef.current?.scrollTo({ top: periods.indexOf(p) * ITEM_H, behavior: 'smooth' })
    const h24 = toH24(selH, p)
    onChange(`${String(h24).padStart(2, '0')}:${selM}`)
  }

  // 스크롤이 snap 위치에 정착하면 100ms 후 상태 동기화
  function makeScrollHandler(
    ref: React.RefObject<HTMLDivElement>,
    items: string[],
    key: 'h' | 'm' | 'p',
    onSettle: (item: string) => void
  ) {
    return () => {
      if (!initialized.current) return
      clearTimeout(scrollTimers.current[key])
      scrollTimers.current[key] = setTimeout(() => {
        const el = ref.current
        if (!el) return
        const idx = Math.round(el.scrollTop / ITEM_H)
        onSettle(items[Math.max(0, Math.min(idx, items.length - 1))])
      }, 100)
    }
  }

  const onHourScroll = makeScrollHandler(hourRef, hours, 'h', h => setSelH(h))
  const onMinuteScroll = makeScrollHandler(minRef, minutes, 'm', m => setSelM(m))
  const onPeriodScroll = makeScrollHandler(periodRef, periods, 'p', p => {
    setSelP(p as 'AM' | 'PM')
    const h24 = toH24(cur.current.h, p as 'AM' | 'PM')
    onChange(`${String(h24).padStart(2, '0')}:${cur.current.m}`)
  })

  const colStyle: React.CSSProperties = {
    scrollbarWidth: 'none',
    scrollSnapType: 'y mandatory',
    overflowY: 'scroll',
  }
  const snapItem: React.CSSProperties = { scrollSnapAlign: 'center' }

  const colCls = 'relative flex-1 z-10'
  const itemCls = (active: boolean) =>
    `h-[44px] flex items-center justify-center cursor-pointer select-none text-[18px] font-medium transition-colors ${active ? 'text-[#161616]' : 'text-[#808080]'}`

  return (
    <div className="border border-[#2592FF] rounded-[20px] overflow-hidden bg-white">
      <div className="relative flex h-[176px]">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[44px] bg-[#f3f9ff] rounded-[10px] pointer-events-none z-0" />
        <div ref={hourRef} className={colCls} style={colStyle} onScroll={onHourScroll}>
          <div className="py-[66px]">
            {hours.map(h => (
              <div key={h} onClick={() => selectHour(h)} className={itemCls(h === selH)} style={snapItem}>{h}</div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center self-center text-[18px] font-semibold text-[#494949] pointer-events-none">:</div>
        <div ref={minRef} className={colCls} style={colStyle} onScroll={onMinuteScroll}>
          <div className="py-[66px]">
            {minutes.map(m => (
              <div key={m} onClick={() => selectMinute(m)} className={itemCls(m === selM)} style={snapItem}>{m}</div>
            ))}
          </div>
        </div>
        <div ref={periodRef} className={colCls} style={colStyle} onScroll={onPeriodScroll}>
          <div className="py-[66px]">
            {periods.map(p => (
              <div key={p} onClick={() => selectPeriod(p as 'AM' | 'PM')} className={itemCls(p === selP)} style={snapItem}>{p}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
