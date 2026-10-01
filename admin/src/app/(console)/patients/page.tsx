'use client'

import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import CountBadge from '@/components/people/CountBadge'
import DirectoryShell, { usePeopleFilter } from '@/components/people/DirectoryShell'
import PersonCard from '@/components/people/PersonCard'
import PersonDetailModal from '@/components/people/PersonDetailModal'
import { GenderText, NationalityText, PhoneText } from '@/components/people/PersonMeta'
import { patientApi } from '@/lib/api'
import { formatDateTime, visaLabel } from '@/lib/labels'
import { queryKeys } from '@/lib/queryKeys'
import type { PatientItem } from '@/lib/schemas'

/** Figma: 이주민 관리 (node 1786:8146) */
export default function PatientsPage() {
  const [filter, actions] = usePeopleFilter()
  const [opened, setOpened] = useState<PatientItem | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.patients.list(filter),
    queryFn: () => patientApi.list(filter),
    placeholderData: keepPreviousData,
  })
  const items = data?.payload ?? []

  return (
    <>
      <DirectoryShell
        title="이주민 관리"
        subtitle="이주민의 기본 정보와 통번역 서비스 이용 이력을 확인하세요"
        searchPlaceholder="환자 검색"
        filter={filter}
        actions={actions}
        totalPages={data?.pageInfo?.totalPages ?? 0}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="아직 등록된 이주민이 없어요"
      >
        {items.map(p => (
          <PersonCard
            key={p.patientId}
            name={p.name ?? '-'}
            badge={<CountBadge count={p.consultationCount} unit="진료" newLabel="신규 등록" />}
            nationality={p.nationality}
            gender={p.gender}
            phone={p.phone}
            onClick={() => setOpened(p)}
          />
        ))}
      </DirectoryShell>

      {opened && <PatientDetail item={opened} onClose={() => setOpened(null)} />}
    </>
  )
}

function PatientDetail({ item, onClose }: { item: PatientItem; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.patients.detail(item.patientId),
    queryFn: () => patientApi.detail(item.patientId).then(r => r.payload ?? null),
  })
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.patients.consultations(item.patientId),
    queryFn: () => patientApi.consultations(item.patientId).then(r => r.payload ?? []),
  })

  const iconValue = 'font-semibold text-ink-grey'

  return (
    <PersonDetailModal
      title={detail?.name ?? item.name ?? '-'}
      badge={<CountBadge count={item.consultationCount} unit="진료" newLabel="신규 등록" />}
      rows={[
        [
          { label: '생년월일', value: detail?.birthDate ?? '-' },
          { label: '성별', value: <GenderText value={detail?.gender ?? item.gender} iconAfter className={iconValue} /> },
          { label: '전화번호', value: <PhoneText value={detail?.phone ?? item.phone} className={iconValue} /> },
        ],
        [
          { label: '국적', value: <NationalityText value={detail?.nationality ?? item.nationality} iconAfter className={iconValue} /> },
          { label: '비자', value: visaLabel(detail?.visaType) },
          { label: '거주지', value: detail?.region || '-' },
        ],
      ]}
      historyTitle="통번역 서비스 이용 이력"
      history={history.map(h =>
        [formatDateTime(h.consultationDate).slice(0, 10), h.hospitalName, h.interpreterName && `${h.interpreterName} 통번역가`]
          .filter(Boolean).join(' · '))}
      emptyHistory="아직 이용 이력이 없어요"
      loading={isLoading || historyLoading}
      onClose={onClose}
    />
  )
}
