'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { adminApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { alertKey, alertMeta, loadReadAlerts, saveReadAlerts } from '@/lib/alerts'

/** Figma: 홈 화면 & 알림 › 1) Notice - 사이드팝업 */
export default function NotificationPopover({ onClose, offsetLeft }: { onClose: () => void; offsetLeft: number }) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [read, setRead] = useState<Set<string>>(() => new Set())

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => adminApi.dashboard().then(r => r.payload ?? null),
    select: d => d?.alerts ?? [],
  })

  useEffect(() => { setRead(loadReadAlerts()) }, [])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element
      // 토글 버튼 클릭은 버튼 쪽에서 처리 (여기서 닫으면 곧바로 다시 열림)
      if (target.closest('[data-notice-toggle]')) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function open(key: string, href: string) {
    const next = new Set(read).add(key)
    setRead(next)
    saveReadAlerts(next)
    onClose()
    router.push(href)
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="새로운 알림"
      style={{ left: offsetLeft }}
      className="fixed top-[82px] z-50 flex h-[446px] w-[321px] flex-col gap-[14px] overflow-y-auto rounded-[12px] border border-brand-blue/20 bg-white p-[14px]"
    >
      {isLoading && <p className="text-[13px] text-ink-grey2">불러오는 중...</p>}
      {!isLoading && alerts.length === 0 && (
        <p className="text-[13px] text-ink-grey2">새로운 알림이 없어요.</p>
      )}
      {alerts.map((alert, i) => {
        const key = alertKey(alert)
        const meta = alertMeta(alert)
        const unread = !read.has(key)
        return (
          <Fragment key={key}>
            {i > 0 && <hr className="border-line" />}
            <button
              type="button"
              onClick={() => open(key, meta.href)}
              className="flex w-full flex-col items-start gap-[4px] text-left"
            >
              <span className="flex items-center gap-[4px]">
                <span className={clsx('text-[12px] font-semibold leading-[1.6]', unread ? 'text-brand-blue' : 'font-medium text-line-grey2')}>
                  {meta.category}
                </span>
                {unread && <img src="/icons/dot.svg" alt="" width={6} height={6} />}
              </span>
              <span className={clsx('text-[13px] font-medium', unread ? 'text-ink' : 'text-ink-grey2')}>
                {meta.title} | {alert.message}
              </span>
            </button>
          </Fragment>
        )
      })}
      <Link
        href="/notifications"
        onClick={onClose}
        className="mt-auto pt-2 text-center text-[13px] font-semibold text-brand-blue hover:underline"
      >
        전체 알림 보기
      </Link>
    </div>
  )
}
