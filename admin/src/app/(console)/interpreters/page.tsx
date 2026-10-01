'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import CountBadge from '@/components/people/CountBadge'
import DirectoryShell, { usePeopleFilter } from '@/components/people/DirectoryShell'
import PersonCard from '@/components/people/PersonCard'
import PersonDetailModal from '@/components/people/PersonDetailModal'
import { GenderText, NationalityText, PhoneText } from '@/components/people/PersonMeta'
import { interpreterApi } from '@/lib/api'
import { formatDateTime } from '@/lib/labels'
import { queryKeys } from '@/lib/queryKeys'
import type { InterpreterItem } from '@/lib/schemas'

/** Figma: 통번역가 관리 (node 1790:13149) */
export default function InterpretersPage() {
  const [filter, actions] = usePeopleFilter()
  const [opened, setOpened] = useState<InterpreterItem | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.interpreters.list(filter),
    queryFn: () => interpreterApi.list(filter),
    placeholderData: keepPreviousData,
  })
  const items = data?.payload ?? []

  return (
    <>
      <DirectoryShell
        title="통번역가 관리"
        subtitle="통번역가 프로필과 활동 가능 여부를 확인하세요"
        searchPlaceholder="통번역가 검색"
        filter={filter}
        actions={actions}
        totalPages={data?.pageInfo?.totalPages ?? 0}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="아직 등록된 통번역가가 없어요"
      >
        {items.map(i => (
          <PersonCard
            key={i.interpreterId}
            name={i.name ?? '-'}
            badge={<CountBadge count={i.totalConsultationCount} unit="통번역" newLabel="신규" />}
            nationality={i.nationality}
            gender={i.gender}
            phone={i.phone}
            onClick={() => setOpened(i)}
          />
        ))}
      </DirectoryShell>

      {opened && <InterpreterDetail item={opened} onClose={() => setOpened(null)} />}
    </>
  )
}

function InterpreterDetail({ item, onClose }: { item: InterpreterItem; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.interpreters.detail(item.interpreterId),
    queryFn: () => interpreterApi.detail(item.interpreterId).then(r => r.payload ?? null),
  })
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.interpreters.consultations(item.interpreterId),
    queryFn: () => interpreterApi.consultations(item.interpreterId).then(r => r.payload ?? []),
  })

  const iconValue = 'font-semibold text-ink-grey'
  const languages = detail?.languages ?? item.languages

  // Figma 시안은 이주민 모달을 복사해 비자·거주지 칸이 남아 있다. 통번역가에 있는 정보로 채운다.
  return (
    <PersonDetailModal
      title={detail?.name ?? item.name ?? '-'}
      badge={<CountBadge count={item.totalConsultationCount} unit="통번역" newLabel="신규" />}
      rows={[
        [
          { label: '사용 언어', value: languages.length > 0 ? languages.join(', ') : '-' },
          { label: '성별', value: <GenderText value={detail?.gender ?? item.gender} iconAfter className={iconValue} /> },
          { label: '전화번호', value: <PhoneText value={detail?.phone ?? item.phone} className={iconValue} /> },
        ],
        [
          { label: '국적', value: <NationalityText value={detail?.nationality ?? item.nationality} iconAfter className={iconValue} /> },
          { label: '활동 지역', value: detail?.availableRegions || '-' },
          { label: '활동 시간', value: detail?.availableTimes || '-' },
        ],
      ]}
      historyTitle="통번역 이력"
      history={history.map(h =>
        [formatDateTime(h.consultationDate).slice(0, 10), h.hospitalName, h.patientName].filter(Boolean).join(' · '))}
      emptyHistory="아직 통번역 이력이 없어요"
      loading={isLoading || historyLoading}
      onClose={onClose}
    />
  )
}
