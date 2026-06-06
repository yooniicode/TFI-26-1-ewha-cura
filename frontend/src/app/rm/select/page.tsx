'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import StepIndicator from '@/components/interpreter/StepIndicator'
import { consultationApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Consultation } from '@/lib/types'

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getDateLabel(dateStr: string) {
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  if (dateStr === todayStr) return '오늘'
  if (dateStr === yesterdayStr) return '어제'
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

function GenderBadge({ gender }: { gender?: string | null }) {
  const src = gender === 'FEMALE'
    ? '/icons/common/gender/small-여성-배경o.svg'
    : '/icons/common/gender/small-남성-배경o.svg'
  return <img src={src} alt={gender === 'FEMALE' ? '여성' : '남성'} width={20} height={20} />
}

export default function RmSelectPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <RmSelectInner />
    </Suspense>
  )
}

function RmSelectInner() {
  const router = useRouter()
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
      <PageHeader title="보고서 작성" showClose />

      <div className="bg-white px-4 pt-7 pb-6">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4]">
            보고서로 작성할<br />진료 메모를 선택합니다
          </h2>
          <p className="mt-2 text-base font-medium text-[#808080]">
            보고서로 쓰이지 않은 메모가 {rmList.length}개 있어요
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
            작성된 진료 메모가 없어요
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rmList.map(c => {
              const isSelected = selectedId === c.id
              const location = [c.hospitalName, c.department].filter(Boolean).join(' ')
              const timeStr = formatTime(c.createdAt)
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
                        <GenderBadge gender={c.patientGender} />
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
          다음으로
        </button>
      </div>
    </AppShell>
  )
}
