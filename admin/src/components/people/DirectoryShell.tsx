'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Spinner from '@/components/Spinner'
import FilterDropdown from '@/components/filters/FilterDropdown'
import SearchBox from '@/components/filters/SearchBox'
import Pagination from '@/components/ui/Pagination'
import { useDebounced } from '@/hooks/useDebounced'
import type { PeopleFilter } from '@/lib/api'
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/labels'

/** 검색어 · 언어 · 성별 · 페이지 상태 — 조건이 바뀌면 첫 페이지로 */
export function usePeopleFilter(): [PeopleFilter, {
  search: string
  setSearch: (v: string) => void
  setLanguages: (v: string[]) => void
  setGenders: (v: string[]) => void
  setPage: (v: number) => void
}] {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [genders, setGenders] = useState<string[]>([])
  const query = useDebounced(search, 300)

  useEffect(() => { setPage(0) }, [query, languages, genders])

  return [{ page, query, languages, genders }, { search, setSearch, setLanguages, setGenders, setPage }]
}

/** Figma: 이주민 관리 · 통번역가 관리 공통 틀 — 헤더 · 툴바 · 4열 카드 그리드 · 페이지네이션 */
export default function DirectoryShell({
  title, subtitle, searchPlaceholder, filter, actions, totalPages, isLoading, isError, emptyMessage, children,
}: {
  title: string
  subtitle: string
  searchPlaceholder: string
  filter: PeopleFilter
  actions: ReturnType<typeof usePeopleFilter>[1]
  totalPages: number
  isLoading: boolean
  isError: boolean
  emptyMessage: string
  /** 카드 목록. 비어 있으면 빈 화면 */
  children: React.ReactNode[]
}) {
  const filtered = filter.query.trim() !== '' || filter.languages.length > 0 || filter.genders.length > 0

  return (
    <div className="flex h-[calc(100vh-80px)] min-h-[700px] flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex h-10 items-center justify-end gap-2">
          <SearchBox value={actions.search} onChange={actions.setSearch} placeholder={searchPlaceholder} />
          <FilterDropdown label="언어" options={LANGUAGE_OPTIONS} selected={filter.languages} onChange={actions.setLanguages} />
          <FilterDropdown label="성별" options={GENDER_OPTIONS} selected={filter.genders} onChange={actions.setGenders} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <Spinner />
          ) : isError || children.length === 0 ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[14px] bg-surface-sidebar">
              <p className="text-[20px] font-medium text-brand-blue">
                {isError ? '목록을 불러오지 못했어요' : filtered ? '조건에 맞는 결과가 없어요' : emptyMessage}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-5">{children}</div>
          )}
        </div>

        <Pagination page={filter.page} totalPages={Math.max(totalPages, 1)} onChange={actions.setPage} className="h-10 shrink-0" />
      </div>
    </div>
  )
}
