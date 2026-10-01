'use client'

import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/PageHeader'
import Spinner from '@/components/Spinner'
import FilterDropdown from '@/components/filters/FilterDropdown'
import SearchBox from '@/components/filters/SearchBox'
import Pagination from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { useDebounced } from '@/hooks/useDebounced'
import { reportApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/queryKeys'
import { LANGUAGE_OPTIONS } from '@/lib/labels'
import type { ReportItem, ReportStatus } from '@/lib/schemas'
import PeriodDropdown, { type Period } from './_components/PeriodDropdown'
import RejectModal from './_components/RejectModal'
import ReportDetailPanel from './_components/ReportDetailPanel'
import ReportList from './_components/ReportList'
import StatusTabs, { type ReportTab } from './_components/StatusTabs'

/** 탭 → 조회 상태. "전체"는 제출된 보고서(작성중 제외) */
const TAB_STATUSES: Record<ReportTab, ReportStatus[]> = {
  pending:  ['PENDING'],
  all:      ['PENDING', 'APPROVED', 'REJECTED'],
  rejected: ['REJECTED'],
}

const EMPTY_MESSAGE: Record<ReportTab, string> = {
  pending:  '승인을 기다리는 보고서가 없어요',
  all:      '아직 제출된 보고서가 없어요',
  rejected: '반려한 보고서가 없어요',
}

function errorMessage(e: unknown) {
  return e instanceof ApiError && e.message ? e.message : '처리하지 못했어요. 다시 시도해주세요.'
}

/** Figma: 보고서 (node 1749:2882) */
export default function ReportsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<ReportTab>('pending')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [period, setPeriod] = useState<Period>({ preset: 'all' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')
  const query = useDebounced(search, 300)

  useEffect(() => { setPage(0) }, [tab, query, languages, period])

  const filter = { page, statuses: TAB_STATUSES[tab], languages, query, from: period.from, to: period.to }
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.reports.list(filter),
    queryFn: () => reportApi.list(filter),
    placeholderData: keepPreviousData,
  })

  const items = data?.payload ?? []
  const totalPages = data?.pageInfo?.totalPages ?? 0
  const selected = items.find(i => i.consultationId === selectedId) ?? items[0] ?? null

  function onReviewed(item: ReportItem) {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    queryClient.invalidateQueries({ queryKey: queryKeys.matching.all })
    // 승인 필요 탭에서는 처리한 보고서가 목록에서 빠지므로 다음 보고서를 보여준다
    setSelectedId(item.consultationId)
  }

  const approve = useMutation({
    mutationFn: (item: ReportItem) => reportApi.approve(item.consultationId),
    onSuccess: (_, item) => {
      onReviewed(item)
      toast('보고서 승인 완료', `${item.interpreterName ?? '통번역가'} 통번역가님에게 승인 알림을 보냈어요`)
    },
    onError: e => toast('승인하지 못했어요', errorMessage(e), 'danger'),
  })

  const reject = useMutation({
    mutationFn: ({ item, reason }: { item: ReportItem; reason: string }) => reportApi.reject(item.consultationId, reason),
    onSuccess: (_, { item }) => {
      setRejecting(false)
      onReviewed(item)
      toast('보고서 반려', `${item.interpreterName ?? '통번역가'} 통번역가님에게 반려 알림을 보냈어요`, 'danger')
    },
    onError: e => setRejectError(errorMessage(e)),
  })

  const busy = approve.isPending || reject.isPending

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-[700px] flex-col gap-6">
      <PageHeader title="보고서 관리" subtitle="통번역가가 작성한 진료 보고서를 확인해요" />

      <div className="flex h-10 items-center justify-between gap-4">
        <StatusTabs value={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="환자 · 통번역가 검색" />
          <FilterDropdown label="언어" options={LANGUAGE_OPTIONS} selected={languages} onChange={setLanguages} />
          <PeriodDropdown value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-5">
        <section
          aria-label="보고서 목록"
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <Spinner />
            ) : isError ? (
              <EmptyMessage message="보고서를 불러오지 못했어요" />
            ) : items.length === 0 ? (
              <EmptyMessage message={EMPTY_MESSAGE[tab]} />
            ) : (
              <ReportList items={items} selectedId={selected?.consultationId ?? null} onSelect={i => setSelectedId(i.consultationId)} />
            )}
          </div>
          <Pagination page={page} totalPages={Math.max(totalPages, 1)} onChange={setPage} className="h-[72px] shrink-0" />
        </section>

        {selected ? (
          <ReportDetailPanel
            key={selected.consultationId}
            item={selected}
            busy={busy}
            onApprove={() => approve.mutate(selected)}
            onReject={() => { setRejectError(''); setRejecting(true) }}
          />
        ) : (
          <div className="flex h-full w-[620px] shrink-0 items-center justify-center rounded-[14px] border border-line bg-white">
            <p className="text-[14px] text-ink-grey2">보고서를 선택해주세요</p>
          </div>
        )}
      </div>

      {rejecting && selected && (
        <RejectModal
          busy={reject.isPending}
          error={rejectError}
          onClose={() => setRejecting(false)}
          onSubmit={reason => reject.mutate({ item: selected, reason })}
        />
      )}
    </div>
  )
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center bg-surface-sidebar">
      <p className="text-[18px] font-medium text-brand-blue">{message}</p>
    </div>
  )
}
