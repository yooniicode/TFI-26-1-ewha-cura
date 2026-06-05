'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { consultationApi, scriptApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useTTS } from '@/hooks/useTTS'
import type { Consultation, MedicalScript } from '@/lib/types'

type View = 'compose' | 'result'

const CHIP_GROUPS = [
  {
    labelKey: 'chip_duration_label' as const,
    chips: [
      { koText: '오늘부터 아파요',   tKey: 'chip_today'     as const },
      { koText: '며칠 전부터 아파요', tKey: 'chip_few_days'  as const },
      { koText: '오래전부터 아파요',  tKey: 'chip_long_ago'  as const },
    ],
  },
  {
    labelKey: 'chip_other_label' as const,
    chips: [
      { koText: '열이 나요',       tKey: 'chip_fever'       as const },
      { koText: '식욕이 없어요',   tKey: 'chip_no_appetite' as const },
      { koText: '잠을 못 자요',    tKey: 'chip_cant_sleep'  as const },
      { koText: '전신이 피곤해요', tKey: 'chip_fatigue'     as const },
    ],
  },
  {
    labelKey: 'chip_special_label' as const,
    chips: [
      { koText: '약물 알레르기가 있어요', tKey: 'chip_allergy'      as const },
      { koText: '임신 중이에요',          tKey: 'chip_pregnant'     as const },
      { koText: '당뇨가 있어요',          tKey: 'chip_diabetes'     as const },
      { koText: '고혈압이 있어요',        tKey: 'chip_hypertension' as const },
    ],
  },
]

export default function CustomScriptPage() {
  const params = useParams()
  const patientId = params.patientId as string
  const { t } = useTranslation()
  const ui = t.medical_script_ui

  const [view, setView] = useState<View>('compose')
  const { speak, speaking } = useTTS()
  const [text, setText] = useState('')
  const [medication, setMedication] = useState<string | null>(null)
  const [recentConsultationId, setRecentConsultationId] = useState<string | null>(null)
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MedicalScript | null>(null)

  useEffect(() => {
    consultationApi.byPatient(patientId, 0)
      .then(r => {
        const list = r.payload as Consultation[] | undefined
        const first = list?.[0]
        const med = first?.medicationInstruction?.trim()
        if (med) setMedication(med)
        if (first?.id) setRecentConsultationId(first.id)
      })
      .catch(() => {})
      .finally(() => setLoadingMeds(false))
  }, [patientId])

  function appendChip(koText: string) {
    setError(null)
    setText(prev => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${koText}` : koText
    })
  }

  async function handleGenerate() {
    if (!text.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const res = await scriptApi.generate({
        patientId,
        consultationId: recentConsultationId ?? undefined,
        scriptType: 'GENERAL',
        additionalContext: text.trim(),
      })
      setResult(res.payload)
      setView('result')
    } catch {
      setError(ui.custom_error)
    } finally {
      setGenerating(false)
    }
  }

  if (view === 'result' && result) {
    return (
      <AppShell noPadding>
        <div className="bg-white min-h-screen flex flex-col">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
            <button
              type="button"
              onClick={() => setView('compose')}
              className="w-6 flex items-center justify-center text-gray-400"
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M7 1L1 7l6 6" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">
              {ui.show_doctor_title}
            </h1>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-8">
            <div className="w-full bg-[#F3F9FF] rounded-2xl px-6 py-10 border border-[#D1E8FF] relative">
              <p className="text-3xl font-bold text-[#161616] leading-relaxed text-center whitespace-pre-wrap">
                {result.contentKo}
              </p>
              <button
                type="button"
                onClick={() => speak(result.contentKo)}
                className={`absolute bottom-4 right-4 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  speaking ? 'bg-[#2592FF]' : 'bg-[#D1E8FF] hover:bg-[#b8d9ff]'
                }`}
                title="한국어로 듣기"
              >
                {speaking ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2592FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                    <path d="M19.07 4.93a10 10 0 010 14.14" />
                  </svg>
                )}
              </button>
            </div>
            {result.contentOrigin && (
              <div className="w-full bg-[#F5F5F5] rounded-2xl px-6 py-8">
                <p className="text-xl text-[#494949] leading-relaxed text-center whitespace-pre-wrap">
                  {result.contentOrigin}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-10 pt-4 border-t border-[#EEEEEE] flex gap-3">
            <button
              type="button"
              onClick={() => setView('compose')}
              className="flex-1 h-[56px] rounded-2xl bg-[#F0F1F5] text-[#494949] font-semibold text-base hover:bg-[#e4e4e8] transition-colors"
            >
              {ui.other_script}
            </button>
            <Link
              href={`/scripts/${result.id}/present`}
              className="flex-1 h-[56px] rounded-2xl bg-[#2592FF] text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1a7ee6] transition-colors"
            >
              {ui.fullscreen}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell noPadding>
      <PageHeader title={ui.custom_title} />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-36 min-h-screen">
        <p className="text-sm text-[#808080] mb-5 leading-relaxed">{ui.custom_subtitle}</p>

        {/* 복용 중인 약 칩 */}
        {!loadingMeds && medication && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">
              {ui.chip_medication_label}
            </p>
            <button
              type="button"
              onClick={() => appendChip(`현재 ${medication} 복용 중이에요`)}
              className="inline-flex items-center px-4 py-2 rounded-full bg-[#EAF4FF] text-[#2592FF] text-sm font-semibold border border-[#D1E8FF] hover:bg-[#d5ecff] transition-colors"
            >
              {ui.chip_medication(medication)}
            </button>
          </div>
        )}

        {/* 키워드 칩 그룹 */}
        {CHIP_GROUPS.map(group => (
          <div key={group.labelKey} className="mb-5">
            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">
              {ui[group.labelKey]}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.chips.map(chip => (
                <button
                  key={chip.tKey}
                  type="button"
                  onClick={() => appendChip(chip.koText)}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-white text-[#494949] text-sm font-medium border border-[#E0E0E0] hover:bg-[#f3f9ff] hover:border-[#D1E8FF] hover:text-[#2592FF] transition-colors"
                >
                  {ui[chip.tKey]}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 직접 입력 textarea */}
        <div className="mt-2">
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            placeholder={ui.custom_placeholder}
            rows={5}
            className="w-full rounded-2xl bg-white border border-[#E0E0E0] px-4 py-4 text-base text-[#161616] placeholder-[#A0A0A0] focus:outline-none focus:border-[#2592FF] resize-none leading-relaxed"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
        )}
      </div>

      {/* 하단 고정 생성 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-8 pt-4 bg-white border-t border-[#EEEEEE]">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !text.trim()}
          className="w-full h-[56px] rounded-2xl bg-[#2592FF] text-white font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1a7ee6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {ui.custom_generating}
            </>
          ) : ui.custom_generate_btn}
        </button>
      </div>
    </AppShell>
  )
}
