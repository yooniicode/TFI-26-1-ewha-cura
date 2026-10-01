'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { adminApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useMe } from '@/hooks/useMe'
import type { CalendarItem } from '@/lib/schemas'

function toIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '-'
  return iso.slice(0, 16).replace('T', ' ')
}

function count(n: number | undefined) {
  return n === undefined ? '-' : `${n}건`
}

/** Figma: 홈 화면 & 알림 › 홈 · 현황판 */
export default function DashboardPage() {
  const now = new Date()
  const today = toIsoDate(now)
  const { data: me } = useMe()

  const { data: overview } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => adminApi.dashboard().then(r => r.payload ?? null),
  })

  const { data: todayItems = [] } = useQuery({
    queryKey: queryKeys.calendar(today, today),
    queryFn: () => adminApi.calendar(today, today).then(r => r.payload ?? []),
    select: days => days.flatMap(d => d.items),
  })

  return (
    <div className="flex max-w-[1120px] flex-col gap-10">
      <header className="flex flex-col gap-1">
        <p className="text-[20px] font-semibold text-ink-grey">
          {overview?.centerName ?? me?.centerName ?? ''}
        </p>
        <h1 className="text-[32px] font-bold text-ink">
          {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </h1>
      </header>

      <div className="flex items-start gap-5">
        <StatCard
          label="새로운 진료 요청"
          value={count(overview?.today.newRequestCount)}
          caption="통번역가를 배정해주세요"
          href="/matching"
          tone="blue"
        />
        <StatCard
          label="새로운 진료 보고서"
          value={count(overview?.approval.pendingReportCount)}
          caption="보고서를 확인해주세요"
          href="/reports"
          tone="green"
        />

        <section className="flex h-[374px] min-w-px flex-1 flex-col justify-between gap-4 overflow-hidden rounded-[20px] bg-surface-card p-5">
          <div className="flex flex-col gap-[10px] font-semibold text-ink-grey">
            <h2 className="text-[18px]">오늘 예정된 진료</h2>
            <p className="text-[36px]">{count(todayItems.length)}</p>
          </div>
          {todayItems.length > 0 && (
            <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
              {todayItems.map(item => <ScheduleRow key={item.consultationId} item={item} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, caption, href, tone }: {
  label: string
  value: string
  caption: string
  href: string
  tone: 'blue' | 'green'
}) {
  return (
    <section className="flex h-[182px] w-[265px] shrink-0 flex-col justify-between overflow-hidden rounded-[20px] bg-surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-[10px] font-semibold">
          <h2 className="text-[18px] text-ink-grey">{label}</h2>
          <p className={clsx('text-[36px]', tone === 'blue' ? 'text-brand-blue' : 'text-brand-green')}>{value}</p>
        </div>
        <Link
          href={href}
          aria-label={`${label} 바로가기`}
          className={clsx(
            'flex items-center rounded-full p-[5.143px] transition-opacity hover:opacity-80',
            tone === 'blue' ? 'bg-brand-blue' : 'bg-brand-green',
          )}
        >
          {tone === 'blue'
            ? <img src="/icons/arrow-up-right.svg" alt="" width={25.714} height={25.714} />
            : <img src="/icons/arrow-up-right-2.svg" alt="" width={27.551} height={27.551} />}
        </Link>
      </div>
      <p className="text-[14px] font-semibold text-ink-grey2">{caption}</p>
    </section>
  )
}

function ScheduleRow({ item }: { item: CalendarItem }) {
  return (
    // 카드 폭(약 510px) 안에 들어가도록 열 너비를 Figma 비율대로 줄였다 — 이름 칸이 0으로 접히지 않게
    <li className="flex h-16 shrink-0 items-center justify-between gap-3 rounded-[12px] bg-white px-6 py-[14px] text-[14px]">
      <span className="w-[72px] shrink-0 truncate font-semibold text-table-name">{item.patientName ?? '-'}</span>
      <span className="w-[130px] shrink-0 text-center text-ink-grey">{formatDateTime(item.consultationDate)}</span>
      <span className="min-w-0 flex-1 truncate text-center text-ink-grey">{item.hospitalName ?? '-'}</span>
      <span className={clsx('w-[64px] shrink-0 truncate text-center', item.interpreterName ? 'text-ink-grey' : 'text-brand-blue')}>
        {item.interpreterName ?? '미배정'}
      </span>
    </li>
  )
}
