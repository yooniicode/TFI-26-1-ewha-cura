'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import StepIndicator from '@/components/interpreter/StepIndicator'
import { consultationApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { queryKeys } from '@/lib/queryKeys'
import type { Consultation } from '@/lib/types'
import { formatKoreanDateTime } from '@/lib/dateFormat'
import PatientAvatar from '@/components/interpreter/PatientAvatar'

export default function RmSelectPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <RmSelectInner />
    </Suspense>
  )
}

function RmSelectInner() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: consultations = [], isLoading } = useQuery<Consultation[]>({
    queryKey: patientId
      ? queryKeys.consultations.byPatient(patientId, 0)
      : queryKeys.consultations.list(0),
    queryFn: () =>
      patientId
        ? consultationApi.byPatient(patientId, 0).then(r => r.payload ?? [])
        : consultationApi.list(0).then(r => r.payload ?? []),
  })

  const rmList = useMemo(
    () => consultations
      .filter(c => !!c.workDescription?.trim())
      .sort((a, b) => b.consultationDate.localeCompare(a.consultationDate)),
    [consultations],
  )

  const selected = rmList.find(c => c.id === selectedId)

  function handleNext() {
    if (!selected) return
    router.push(`/rm/memo-edit?cid=${selected.id}&patientId=${selected.patientId}`)
  }

  return (
    <AppShell noPadding>
      <PageHeader title={t.report_flow.title} showClose />

      <div className="bg-white px-4 pt-7 pb-6">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] whitespace-pre-line">
            {t.report_flow.memo_list_title}
          </h2>
          <p className="mt-2 text-base font-medium text-[#808080]">
            {t.report_flow.memo_count(rmList.length)}
          </p>
        </div>

        {/* 스텝 인디케이터 — 2단계 */}
        <div className="mb-8">
          <StepIndicator current={2} total={6} />
        </div>

        {/* 목록 */}
        {isLoading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : rmList.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#808080]">
            {t.report_flow.no_memo}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rmList.map(c => {
              const isSelected = selectedId === c.id
              const location = [c.hospitalName, c.department].filter(Boolean).join(' ')
              const timeStr = formatKoreanDateTime(c.createdAt)
              const locationLine = [timeStr, location].filter(Boolean).join(' | ')
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : c.id)}
                  className={`w-full text-left rounded-[8px] border transition-colors ${
                    isSelected
                      ? 'bg-[#f3f9ff] border-[#2592ff]'
                      : 'bg-white border-[#eee]'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex flex-col gap-1 flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] font-medium text-[#161616]">{c.patientName}</span>
                        <PatientAvatar avatarUrl={c.patientAvatarUrl} gender={c.patientGender} size="sm" />
                      </div>
                      {locationLine && (
                        <span className="text-[14px] text-[#808080] truncate">{locationLine}</span>
                      )}
                    </div>
                    {isSelected ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M6 15L12 9L18 15" stroke="#494949" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
                        <path d="M1 1L7 7L1 13" stroke="#494949" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mx-4 mb-4 bg-white rounded-[8px] border border-[#eee] px-4 py-4">
                      <p className="text-[16px] text-[#494949] leading-relaxed line-clamp-3">
                        {c.workDescription}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="w-full h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {t.report_flow.next_btn}
        </button>
      </div>
    </AppShell>
  )
}
