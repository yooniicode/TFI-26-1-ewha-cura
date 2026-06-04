'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import PatientInfoBar, { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
import StepIndicator from '@/components/interpreter/StepIndicator'
import { consultationApi, patientApi } from '@/lib/api'
import type { Consultation, Patient } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}세`
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
  const searchParams = useSearchParams()
  const cid = searchParams.get('cid') ?? ''
  const patientId = searchParams.get('patientId') ?? ''

  const labels = useEnumLabels()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

  const memoRef = useRef(memo)
  memoRef.current = memo

  useEffect(() => {
    if (patientId) {
      patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    }
    if (cid) {
      consultationApi.get(cid).then(r => {
        const c = r.payload ?? null
        setConsultation(c)
        if (c?.workDescription) setMemo(c.workDescription)
      }).catch(() => {})
    }
  }, [patientId, cid])

  async function handleNext() {
    if (!cid || !patientId) return
    setSubmitting(true)
    try {
      // 메모 내용이 수정되었으면 저장
      if (memo.trim() !== (consultation?.workDescription ?? '').trim()) {
        await consultationApi.update(cid, {
          consultationDate: consultation?.consultationDate ?? new Date().toISOString().split('T')[0],
          patientId: consultation?.patientId ?? patientId,
          hospitalId: consultation?.hospitalId ?? null,
          department: consultation?.department ?? '',
          doctorName: consultation?.doctorName ?? '',
          issueType: consultation?.issueType ?? 'MEDICAL',
          method: consultation?.method ?? null,
          processing: consultation?.processing ?? 'INTERPRETATION',
          patientComment: consultation?.patientComment ?? '',
          treatmentResult: consultation?.treatmentResult ?? '',
          diagnosisContent: consultation?.diagnosisContent ?? '',
          diagnosisNameCode: consultation?.diagnosisNameCode ?? '',
          medicationInstruction: consultation?.medicationInstruction ?? '',
          nextAppointmentDate: consultation?.nextAppointmentDate ?? null,
          counselorName: consultation?.counselorName ?? '',
          durationHours: consultation?.durationHours ?? null,
          fee: consultation?.fee ?? null,
          workDescription: memo,
          doctorConfirmationSignature: consultation?.doctorConfirmationSignature ?? '',
          memo: consultation?.memo ?? '',
        })
      }

      // Claude 파싱
      if (memo.trim()) {
        setAiStatus('loading')
        try {
          const res = await fetch('/api/parse-rm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmText: memo }),
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
    } catch {
      setSubmitting(false)
    }
  }

  const patientName = patient?.name ?? consultation?.patientName ?? ''
  const ageStr = calcAge(patient?.birthDate)
  const demographics = patient
    ? [labels.nationality[patient.nationality], labels.gender[patient.gender], ageStr].filter(Boolean).join(' | ')
    : ''
  const flagSrc = patient ? getFlagSrc(patient.nationality) : undefined

  return (
    <AppShell noPadding>
      <PageHeader title="보고서 작성" showClose />

      {/* 환자 정보 바 */}
      <PatientInfoBar
        patientId={patientId || null}
        patientName={patientName}
        subtitle={demographics}
        flagSrc={flagSrc}
      />

      <div className="bg-white px-6 pt-7 pb-6">
        <div className="mb-6">
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4]">
            메모를 살짝<br />수정할 수 있어요
          </h2>
          <p className="mt-2 text-base font-medium text-[#808080]">
            수정이 완료되면 다음으로 넘어가세요
          </p>
        </div>

        {/* 스텝 인디케이터 — 3단계 */}
        <div className="mb-7">
          <StepIndicator current={3} total={6} />
        </div>

        {/* 메모 편집 */}
        <div className="bg-[#F3F9FF] rounded-xl border border-[#D1E8FF] px-4 py-5 min-h-[280px] flex flex-col">
          <p className="text-xs font-semibold text-[#2592FF] mb-3">불러온 메모</p>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="flex-1 w-full min-h-[200px] bg-transparent text-[#161616] text-base leading-relaxed resize-none outline-none placeholder:text-[#808080]"
            placeholder="메모 내용이 없습니다."
          />
        </div>

        {/* AI 상태 */}
        {aiStatus !== 'idle' && (
          <div className={`mt-3 text-center text-xs py-1.5 rounded-lg ${
            aiStatus === 'loading' ? 'bg-blue-50 text-[#2592FF]' :
            aiStatus === 'ok' ? 'bg-green-50 text-green-600' :
            'bg-red-50 text-red-400'
          }`}>
            {aiStatus === 'loading' && 'AI가 메모를 분석하는 중...'}
            {aiStatus === 'ok' && 'AI 분석 완료 — 보고서 칸에 자동 입력됩니다'}
            {aiStatus === 'fail' && 'AI 분석 실패 — 직접 입력해주세요'}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
        <button
          type="button"
          onClick={handleNext}
          disabled={submitting || aiStatus === 'loading'}
          className="w-full h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {aiStatus === 'loading' ? 'AI 분석 중...' : submitting ? '저장 중...' : '보고서 작성하기'}
        </button>
      </div>
    </AppShell>
  )
}
