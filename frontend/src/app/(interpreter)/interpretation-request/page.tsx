'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import { CalendarPicker } from '@/components/ui/DateTimePicker'
import { consultationApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'

const SYMPTOM_KEYS = ['head', 'stomach', 'breath', 'skin', 'joint', 'fever', 'eye', 'pregnancy', 'mental', 'checkup', 'dental', 'other'] as const
type SymptomKey = typeof SYMPTOM_KEYS[number]

export default function InterpretationRequestPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data: me } = useMe()

  const [selectedKeywords, setSelectedKeywords] = useState<SymptomKey[]>([])
  const [preferredDate, setPreferredDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const ti = t.interpretation_request

  function toggleKeyword(key: SymptomKey) {
    setSelectedKeywords(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleSubmit() {
    if (!me?.entityId) { setError(ti.err_no_profile); return }
    if (selectedKeywords.length === 0) { setError(ti.err_no_symptom); return }
    if (!preferredDate) { setError(ti.err_no_date); return }

    setSubmitting(true); setError('')
    try {
      const symptomLabels = selectedKeywords
        .map(k => ti[`symptom_${k}` as keyof typeof ti] as string)
        .filter(Boolean)
        .join(', ')
      const patientComment = [
        `[증상] ${symptomLabels}`,
        note.trim() ? `[요청사항] ${note.trim()}` : '',
      ].filter(Boolean).join('\n')

      await consultationApi.request({
        patientId: me.entityId,
        consultationDate: `${preferredDate}T00:00:00`,
        issueType: 'MEDICAL',
        processing: 'INTERPRETATION',
        patientComment,
      })
      setSubmitted(true)
      setTimeout(() => router.replace('/dashboard'), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : ti.err_submit)
      setSubmitting(false)
    }
  }

  return (
    <AppShell noPadding>
      {/* 제출 완료 애니메이션 오버레이 */}
      {submitted && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
            className="w-32 h-32 rounded-full bg-[#2592FF] flex items-center justify-center shadow-2xl"
          >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path
                d="M16 32L27 43L48 20"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="70"
                style={{ animation: 'drawCheck 0.45s ease-out 0.3s forwards', strokeDashoffset: 70 }}
              />
            </svg>
          </div>
          <p
            className="mt-6 text-white font-bold text-xl"
            style={{ animation: 'fadeUp 0.3s ease-out 0.6s both' }}
          >
            {ti.submit_success}
          </p>
        </div>
      )}

      <PageHeader title={ti.title} />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-32 space-y-4">

        {/* 증상 키워드 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-1">{ti.symptom_question}</p>
          <div className="grid grid-cols-3 gap-2">
            {SYMPTOM_KEYS.map(key => {
              const selected = selectedKeywords.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleKeyword(key)}
                  className={`rounded-2xl px-3 py-3 text-left transition-all border-2 ${
                    selected
                      ? 'border-[#2592FF] bg-[#f3f9ff]'
                      : 'border-[#EEEEEE] bg-white hover:border-[#D1D1D1]'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? 'text-[#2592FF]' : 'text-[#161616]'}`}>
                    {ti[`symptom_${key}` as keyof typeof ti] as string}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 희망 날짜 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-3">{ti.preferred_date}</p>
          <CalendarPicker value={preferredDate} onChange={setPreferredDate} />
        </div>

        {/* 요청사항 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-1">{ti.note_label}</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={ti.note_placeholder}
            rows={4}
            className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3 text-sm text-[#161616] outline-none placeholder:text-[#A0A0A0] resize-none leading-relaxed"
          />
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || selectedKeywords.length === 0 || !preferredDate}
          className="w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors"
        >
          {submitting ? ti.submitting : ti.submit}
        </button>
      </div>
    </AppShell>
  )
}
