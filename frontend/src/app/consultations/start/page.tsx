'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'

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
  const { t } = useTranslation()

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
      <PageHeader title={t.report_flow.title} showClose />

      <div className="bg-white px-4 pt-8 pb-6">
        <div className="mb-7">
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4]">{t.report_flow.select_title}</h2>
          <p className="mt-2 text-base font-medium text-[#808080] leading-relaxed">
            {t.report_flow.select_desc.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>
        </div>

        {/* 스텝 인디케이터 — 1단계 */}
        <div className="flex gap-2 mb-8">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#2592FF] text-white text-sm font-semibold shrink-0">1</div>
          {[2, 3, 4, 5, 6].map(n => (
            <div key={n} className="w-6 h-6 rounded-full flex items-center justify-center bg-[#F7F7F7] text-[#808080] text-sm font-semibold shrink-0">
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
            className={`flex-1 h-[200px] rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all relative ${
              selected === 'scratch' ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-[#F0F0F0] bg-white'
            }`}
          >
            {selected === 'scratch' && (
              <div className="absolute top-3 right-3">
                <img src="/icons/interpreter/report/check.svg" alt="" width={18} height={18} />
              </div>
            )}
            <img src="/icons/interpreter/report/처음부터작성하기.svg" alt="" width={40} height={40} />
            <span className={`text-base font-medium ${selected === 'scratch' ? 'text-[#2592FF]' : 'text-[#494949]'}`}>
              {t.report_flow.from_scratch}
            </span>
          </button>

          {/* 진료 메모 불러오기 */}
          <button
            type="button"
            onClick={() => setSelected('rm')}
            className={`flex-1 h-[200px] rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all relative ${
              selected === 'rm' ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-[#F0F0F0] bg-white'
            }`}
          >
            {selected === 'rm' && (
              <div className="absolute top-3 right-3">
                <img src="/icons/interpreter/report/check.svg" alt="" width={18} height={18} />
              </div>
            )}
            <img src="/icons/interpreter/report/진료메모불러오기.svg" alt="" width={40} height={40} />
            <span className={`text-base font-medium ${selected === 'rm' ? 'text-[#2592FF]' : 'text-[#494949]'}`}>
              {t.report_flow.from_memo}
            </span>
          </button>
        </div>
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
