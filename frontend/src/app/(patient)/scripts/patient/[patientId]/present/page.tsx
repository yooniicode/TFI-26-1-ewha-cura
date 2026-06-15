'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTTS } from '@/hooks/useTTS'

export default function PatientScriptPresentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <PresentInner />
    </Suspense>
  )
}

function PresentInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ko = searchParams.get('ko') ?? ''
  const tr = searchParams.get('tr') ?? ''
  const { speak, speaking } = useTTS()

  // 화면 진입 시 자동 재생
  useEffect(() => {
    if (ko) speak(ko)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ko) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <p className="text-gray-400">표시할 내용이 없습니다.</p>
        <button onClick={() => router.back()} className="mt-4 text-gray-400 underline text-sm">
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col select-none">
      {/* 닫기 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-sm flex items-center gap-1.5 hover:text-gray-200 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          닫기
        </button>
      </div>

      {/* 한국어 — 의사에게 보여주는 메인 텍스트 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 gap-10">
        <div className="w-full max-w-md bg-[#1a2740] rounded-3xl px-8 py-12 border border-[#2a4070] relative">
          <p className="text-4xl font-bold text-white leading-relaxed text-center break-keep">
            {ko}
          </p>
          {/* TTS 재생 버튼 */}
          <button
            type="button"
            onClick={() => speak(ko)}
            className={`absolute bottom-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              speaking ? 'bg-[#2592FF]' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="다시 듣기"
          >
            <img
              src={speaking
                ? '/icons/immigrant/medical-script/speaking.svg'
                : '/icons/immigrant/medical-script/speak.svg'}
              alt=""
              width={20}
              height={20}
            />
          </button>
        </div>

        {/* 환자 모국어 번역 */}
        {tr && (
          <div className="w-full max-w-md bg-gray-800 rounded-2xl px-8 py-8 border border-gray-700">
            <p className="text-2xl text-gray-200 leading-relaxed text-center break-keep">
              {tr}
            </p>
          </div>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="text-center pb-10">
        <p className="text-gray-500 text-sm">이 화면을 의사에게 보여주세요</p>
        <p className="text-gray-600 text-xs mt-1">Cho bác sĩ xem màn hình này</p>
      </div>
    </div>
  )
}
