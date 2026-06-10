'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import StepIndicator from '@/components/interpreter/StepIndicator'
import ReportExitModal from '@/components/ui/ReportExitModal'
import { consultationApi, patientApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/I18nContext'
import type { Consultation, Patient } from '@/lib/types'
import { formatKoreanDateTime } from '@/lib/dateFormat'
import PatientAvatar from '@/components/interpreter/PatientAvatar'

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function RmMemoEditPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <RmMemoEditInner />
    </Suspense>
  )
}

function RmMemoEditInner() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const cid = searchParams.get('cid') ?? ''
  const patientId = searchParams.get('patientId') ?? ''

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [memoText, setMemoText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [showExitModal, setShowExitModal] = useState(false)

  useEffect(() => {
    if (patientId) {
      patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    }
    if (cid) {
      consultationApi.get(cid).then(r => {
        const c = r.payload ?? null
        setConsultation(c)
        setMemoText(c?.workDescription ?? '')
      }).catch(() => {})
    }
  }, [patientId, cid])

  async function handleNext() {
    if (!cid || !patientId) return
    setSubmitting(true)

    try {
      await consultationApi.update(cid, { workDescription: memoText })
    } catch {
      // 저장 실패해도 다음 단계 진행
    }

    if (memoText.trim()) {
      setAiStatus('loading')
      try {
        const res = await fetch('/api/parse-rm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rmText: memoText }),
        })
        if (res.ok) {
          const data = await res.json() as { fields: Record<string, string> | null }
          if (data.fields) {
            sessionStorage.setItem('rm_parsed_fields', JSON.stringify(data.fields))
            setAiStatus('ok')
          } else {
            setAiStatus('fail')
          }
        } else {
          setAiStatus('fail')
        }
      } catch {
        setAiStatus('fail')
      }
    }

    router.push(`/consultations/new?patientId=${patientId}&cid=${cid}`)
  }

  const patientName = patient?.name ?? consultation?.patientName ?? ''
  const age = calcAge(patient?.birthDate)
  const gender = patient?.gender ?? consultation?.patientGender
  const avatarUrl = patient?.avatarUrl ?? consultation?.patientAvatarUrl
  const updatedAtStr = consultation?.updatedAt
    ? `${t.consultation.written_at} ${formatKoreanDateTime(consultation.updatedAt)}`
    : ''

  return (
    <AppShell noPadding>
      <PageHeader title={t.report_flow.title} showClose onClose={() => setShowExitModal(true)} />

      <div className="bg-white px-4 pt-7 pb-4">
        <div className="mb-6">
          <h2 className="text-[26px] font-semibold text-[#161616] leading-[1.4] whitespace-pre-line">
            {t.report_flow.edit_memo_title}
          </h2>
          {updatedAtStr && (
            <p className="mt-2 text-[16px] text-[#808080]">{updatedAtStr}</p>
          )}
        </div>

        <div className="mb-7">
          <StepIndicator current={3} total={6} />
        </div>
      </div>

      {/* 환자 정보 row */}
      <div className="bg-white border-t border-b border-[#eee] px-4 py-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-2"
        >
          <PatientAvatar avatarUrl={avatarUrl} gender={gender} size="sm" />
          <span className="text-[18px] font-medium text-[#161616]">{patientName}</span>
          {age !== null && <span className="text-[18px] text-[#494949]">{t.patient.age_years(age)}</span>}
          <img src="/icons/common/arrows/right.svg" alt="" width={20} height={20} className="ml-auto" />
        </Link>
      </div>

      {/* 메모 텍스트 편집 */}
      <div className="bg-[#f7f7f7] px-4 py-4 pb-36 min-h-screen">
        <div className="bg-white border border-[#eee] rounded-[8px] p-4">
          {consultation ? (
            <textarea
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              placeholder={t.report_flow.memo_placeholder}
              className="w-full text-[18px] text-[#494949] leading-relaxed resize-none outline-none min-h-[300px]"
            />
          ) : (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}
        </div>

        {aiStatus === 'loading' && (
          <div className="mt-3 text-center text-xs py-1.5 rounded-lg bg-blue-50 text-[#2592FF]">
            {t.report_flow.ai_analyzing}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white px-4 pb-8 pt-3 flex gap-2.5 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-[111px] h-[60px] bg-[#f0f1f5] rounded-[8px] text-[18px] font-medium text-[#494949]"
        >
          {t.report_flow.prev_btn}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting || aiStatus === 'loading' || !consultation}
          className="flex-1 h-[60px] bg-[#2592FF] rounded-[8px] text-[18px] font-semibold text-white disabled:opacity-50"
        >
          {aiStatus === 'loading' ? t.realtime_memo.ai_analyzing_btn : submitting ? t.common.saving : t.report_flow.next_btn}
        </button>
      </div>

      {showExitModal && (
        <ReportExitModal
          onStay={() => setShowExitModal(false)}
          onLeave={() => router.replace('/dashboard')}
        />
      )}
    </AppShell>
  )
}
