'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'

export default function ConsultationStartPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <ConsultationStartInner />
    </Suspense>
  )
}

function ConsultationStartInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId')
  const [selected, setSelected] = useState<'scratch' | 'rm' | null>(null)

  function handleNext() {
    if (!selected) return
    if (selected === 'scratch') {
      router.push(patientId ? `/consultations/new?patientId=${patientId}` : '/consultations/patient-select')
    } else {
      router.push(patientId ? `/rm/select?patientId=${patientId}` : '/rm/select')
    }
  }

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
        <button
          onClick={() => router.back()}
          className="w-6 flex items-center justify-center text-gray-400"
        >
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <path d="M10 2L2 10L10 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">보고서 작성</h1>
        <button
          onClick={() => router.back()}
          className="w-6 flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="bg-white px-6 pt-8 pb-6">
        {/* 타이틀 */}
        <div className="mb-7">
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4]">보고서를 작성합니다</h2>
          <p className="mt-2 text-base font-medium text-[#808080] leading-relaxed">
            이미 작성한 메모를 불러오거나<br />
            메모 작성부터 시작할 수 있어요
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-base font-semibold ${
                n === 1 ? 'bg-[#2592ff] text-white' : 'bg-[#F7F7F7] text-[#808080]'
              }`}
            >
              {n}
            </div>
          ))}
        </div>

        {/* 옵션 카드 */}
        <div className="flex gap-3">
          {/* 처음부터 작성하기 */}
          <button
            type="button"
            onClick={() => setSelected('scratch')}
            className={`flex-1 h-[180px] rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
              selected === 'scratch'
                ? 'border-[#2592ff] bg-blue-50'
                : 'border-[#F0F0F0] bg-white'
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                <rect x="1" y="1" width="20" height="26" rx="2" stroke={selected === 'scratch' ? '#2592ff' : '#494949'} strokeWidth="1.6" />
                <path d="M5 8h12M5 13h12M5 18h7" stroke={selected === 'scratch' ? '#2592ff' : '#494949'} strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="22" cy="26" r="5.5" fill={selected === 'scratch' ? '#2592ff' : '#494949'} />
                <path d="M20 26h4M22 24v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={`text-base font-medium ${selected === 'scratch' ? 'text-[#2592ff]' : 'text-[#494949]'}`}>
              처음부터 작성하기
            </span>
          </button>

          {/* 진료 메모 불러오기 */}
          <button
            type="button"
            onClick={() => setSelected('rm')}
            className={`flex-1 h-[180px] rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
              selected === 'rm'
                ? 'border-[#2592ff] bg-blue-50'
                : 'border-[#F0F0F0] bg-white'
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <rect x="1" y="1" width="20" height="26" rx="2" stroke={selected === 'rm' ? '#2592ff' : '#494949'} strokeWidth="1.6" />
                <path d="M5 8h12M5 13h12M5 18h6" stroke={selected === 'rm' ? '#2592ff' : '#494949'} strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="22" cy="24" r="4" stroke={selected === 'rm' ? '#2592ff' : '#494949'} strokeWidth="1.5" fill="none" />
                <path d="M25 27l2.5 2.5" stroke={selected === 'rm' ? '#2592ff' : '#494949'} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className={`text-base font-medium ${selected === 'rm' ? 'text-[#2592ff]' : 'text-[#494949]'}`}>
              진료 메모 불러오기
            </span>
          </button>
        </div>
      </div>

      {/* 하단 바 — sticky: 내용이 짧으면 화면 하단에 붙고, 길면 스크롤 아래에 위치 */}
      <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="w-full h-[60px] bg-[#2592ff] rounded-lg text-lg font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          다음으로
        </button>
      </div>
    </AppShell>
  )
}
