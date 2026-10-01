'use client'

import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/PageHeader'
import Spinner from '@/components/Spinner'
import FilterDropdown, { type FilterOption } from '@/components/filters/FilterDropdown'
import SearchBox from '@/components/filters/SearchBox'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { useDebounced } from '@/hooks/useDebounced'
import { matchingApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { DISPLAY_STATUS_BADGE, DISPLAY_STATUS_LABELS, LANGUAGE_OPTIONS } from '@/lib/labels'
import type { MatchingDisplayStatus, MatchingRequest } from '@/lib/schemas'
import RequestModal from './_components/RequestModal'
import RequestTable from './_components/RequestTable'

const STATUS_OPTIONS: FilterOption<MatchingDisplayStatus>[] =
  (Object.keys(DISPLAY_STATUS_LABELS) as MatchingDisplayStatus[]).map(value => ({
    value,
    label: DISPLAY_STATUS_LABELS[value],
    render: <StatusBadge status={DISPLAY_STATUS_BADGE[value]} />,
  }))

/** Figma: 매칭관리 (node 1716:3848) */
export default function MatchingPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [statuses, setStatuses] = useState<MatchingDisplayStatus[]>([])
  const [opened, setOpened] = useState<MatchingRequest | null>(null)
  const query = useDebounced(search, 300)

  // 조건이 바뀌면 첫 페이지부터
  useEffect(() => { setPage(0) }, [query, languages, statuses])

  const filter = { page, statuses, languages, query }
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.matching.requests(filter),
    queryFn: () => matchingApi.requests(filter),
    placeholderData: keepPreviousData,
  })

  const items = data?.payload ?? []
  const totalPages = data?.pageInfo?.totalPages ?? 0
  const filtered = query.trim() !== '' || languages.length > 0 || statuses.length > 0

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col gap-6">
      <PageHeader title="배정 관리" subtitle="진료 요청을 확인하고 통번역가를 배정해요" />

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex h-10 items-center justify-end gap-2">
          <SearchBox value={search} onChange={setSearch} placeholder="환자 · 통번역가 검색" />
          <FilterDropdown label="언어" options={LANGUAGE_OPTIONS} selected={languages} onChange={setLanguages} />
          <FilterDropdown label="상태" options={STATUS_OPTIONS} selected={statuses} onChange={setStatuses} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : isError ? (
          <EmptyBox message="요청 목록을 불러오지 못했어요" />
        ) : items.length === 0 ? (
          <EmptyBox message={filtered ? '조건에 맞는 요청이 없어요' : '아직 진료 통번역 요청 내역이 없어요'} />
        ) : (
          <RequestTable items={items} onOpen={setOpened} />
        )}

        <Pagination page={page} totalPages={Math.max(totalPages, 1)} onChange={setPage} className="h-10" />
      </div>

      {opened && <RequestModal request={opened} onClose={() => setOpened(null)} />}
    </div>
  )
}

/** Figma: 매칭관리 › 2-1 Empty State */
function EmptyBox({ message }: { message: string }) {
  return (
    <div className="flex min-h-[400px] flex-1 items-center justify-center rounded-[14px] bg-surface-sidebar">
      <p className="text-[20px] font-medium text-brand-blue">{message}</p>
    </div>
  )
}
