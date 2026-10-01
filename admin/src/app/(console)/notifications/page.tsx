'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import PageHeader from '@/components/PageHeader'
import Spinner from '@/components/Spinner'
import PillTabs from '@/components/ui/PillTabs'
import { adminApi } from '@/lib/api'
import { alertKey, alertMeta, loadReadAlerts, saveReadAlerts } from '@/lib/alerts'
import { formatDateTime } from '@/lib/labels'
import { queryKeys } from '@/lib/queryKeys'

type Tab = 'all' | 'matching' | 'reports'

const TABS: { value: Tab; label: string }[] = [
  { value: 'all',      label: '전체' },
  { value: 'matching', label: '매칭 관리' },
  { value: 'reports',  label: '보고서 관리' },
]

const TAB_HREF: Record<Exclude<Tab, 'all'>, string> = { matching: '/matching', reports: '/reports' }

/** 새로운 알림 전체 보기 — Figma 사이드 팝업(1) Notice)의 항목 스타일을 페이지로 확장 */
export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [read, setRead] = useState<Set<string>>(() => new Set())

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => adminApi.dashboard().then(r => r.payload ?? null),
    select: d => d?.alerts ?? [],
  })

  useEffect(() => { setRead(loadReadAlerts()) }, [])

  function markRead(keys: string[]) {
    const next = new Set(read)
    keys.forEach(k => next.add(k))
    setRead(next)
    saveReadAlerts(next)
  }

  const visible = alerts.filter(a => tab === 'all' || alertMeta(a).href === TAB_HREF[tab])
  const unread = visible.filter(a => !read.has(alertKey(a)))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="새로운 알림" subtitle="처리가 필요한 매칭 요청과 보고서를 모아 보여줘요" />

      <div className="flex h-10 items-center justify-between">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} label="알림 종류" />
        {/* 툴바 높이(40)에 맞춘 버튼 — 필터 트리거와 같은 테두리 스타일 */}
        <button
          type="button"
          disabled={unread.length === 0}
          onClick={() => markRead(unread.map(alertKey))}
          className="flex h-10 items-center rounded-[8px] border border-line bg-white px-[14px] text-[14px] font-medium text-ink-grey hover:bg-surface-muted disabled:opacity-40"
        >
          모두 읽음으로 표시
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-[14px] bg-surface-sidebar">
          <p className="text-[20px] font-medium text-brand-blue">새로운 알림이 없어요</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
          {visible.map(alert => {
            const key = alertKey(alert)
            const meta = alertMeta(alert)
            const isUnread = !read.has(key)
            return (
              <li key={key} className={clsx('flex items-center justify-between gap-6 px-6 py-4', isUnread && 'bg-brand-blue-bg/50')}>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-1">
                    <span className={clsx('text-[12px] leading-[1.6]', isUnread ? 'font-semibold text-brand-blue' : 'font-medium text-line-grey2')}>
                      {meta.category}
                    </span>
                    {isUnread && <img src="/icons/dot.svg" alt="안 읽음" width={6} height={6} />}
                  </span>
                  <p className={clsx('truncate text-[15px] font-medium', isUnread ? 'text-ink' : 'text-ink-grey2')}>
                    {meta.title} | {alert.message}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="text-[13px] text-ink-grey2">{formatDateTime(alert.occurredAt)}</span>
                  <Link
                    href={meta.href}
                    onClick={() => markRead([key])}
                    className="inline-flex h-8 items-center rounded-[8px] bg-brand-blue-bg px-[14px] text-[13px] font-semibold text-brand-blue hover:bg-surface-nav-active"
                  >
                    바로가기
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
