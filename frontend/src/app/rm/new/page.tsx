'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { consultationApi, patientApi } from '@/lib/api'
import type { Consultation, Patient } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'

function consultDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
}

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}세`
}

export default function RmNewPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <RmWriteInner />
    </Suspense>
  )
}

function RmWriteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''
  const cid = searchParams.get('cid')

  const labels = useEnumLabels()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (patientId) {
      patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    }
    if (cid) {
      consultationApi.get(cid).then(r => {
        const c = r.payload ?? null
        setConsultation(c)
        if (c?.workDescription) setRemark(c.workDescription)
      }).catch(() => {})
    }
  }, [patientId, cid])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId || !remark.trim()) return
    setSubmitting(true)
    setError('')
    try {
      if (cid && consultation) {
        await consultationApi.update(cid, {
          consultationDate: consultation.consultationDate,
          patientId: consultation.patientId,
          hospitalId: consultation.hospitalId ?? null,
          department: consultation.department ?? '',
          doctorName: consultation.doctorName ?? '',
          issueType: consultation.issueType,
          method: consultation.method ?? null,
          processing: consultation.processing ?? 'INTERPRETATION',
          patientComment: consultation.patientComment ?? '',
          treatmentResult: consultation.treatmentResult ?? '',
          diagnosisContent: consultation.diagnosisContent ?? '',
          diagnosisNameCode: consultation.diagnosisNameCode ?? '',
          medicationInstruction: consultation.medicationInstruction ?? '',
          nextAppointmentDate: consultation.nextAppointmentDate ?? null,
          counselorName: consultation.counselorName ?? '',
          durationHours: consultation.durationHours ?? null,
          fee: consultation.fee ?? null,
          workDescription: remark,
          doctorConfirmationSignature: consultation.doctorConfirmationSignature ?? '',
          memo: consultation.memo ?? '',
        })
      } else {
        await consultationApi.create({
          patientId,
          consultationDate: new Date().toISOString().split('T')[0],
          issueType: 'MEDICAL',
          processing: 'INTERPRETATION',
          workDescription: remark,
        })
      }
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      setSubmitting(false)
    }
  }

  const contextDate = consultation
    ? consultDateKo(consultation.consultationDate)
    : consultDateKo(new Date().toISOString().split('T')[0])

  const contextLocation = consultation
    ? [consultation.hospitalName, consultation.department].filter(Boolean).join(' ')
    : ''

  const patientName = patient?.name ?? consultation?.patientName ?? ''
  const demographics = patient
    ? [
        labels.nationality[patient.nationality],
        labels.gender[patient.gender],
        calcAge(patient.birthDate),
      ].filter(Boolean).join(' | ')
    : ''

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
        <button onClick={() => router.back()} className="text-gray-400 text-xl leading-none w-6">←</button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">실시간 Remark 작성</h1>
        <div className="w-6" />
      </div>

      {/* 환자 정보 바 */}
      <div className="bg-white px-8 py-5 border-b border-[#F6F6F6] flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <span className="text-[#161616] text-xl font-medium">{patientName}</span>
          {demographics && (
            <span className="text-[#808080] text-base">{demographics}</span>
          )}
        </div>
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="w-1.5 h-4 rounded-sm border-2 border-[#C7C7C7]" />
        </div>
      </div>

      {/* 메인 카드 */}
      <div className="bg-neutral-100 px-4 py-4 min-h-screen">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-4" style={{ minHeight: 498 }}>
            {/* 이번 진료 */}
            <div className="flex flex-col gap-1">
              <span className="text-[#161616] text-base font-medium">이번진료</span>
              <span className="text-[#5D5D5D] text-base">{contextDate}</span>
              {contextLocation && (
                <span className="text-[#5D5D5D] text-base max-w-[200px]">{contextLocation}</span>
              )}
            </div>

            {/* Remark 텍스트 영역 */}
            <textarea
              className="flex-1 w-full min-h-[300px] px-4 py-6 bg-[#F3F9FF] rounded-lg border border-[#D1E8FF] text-[#161616] text-base leading-relaxed resize-none focus:outline-none focus:border-blue-400 placeholder:text-[#808080]"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder={'예시\n\n얼굴에 1도 화상으로 내원함. 처방받은 연고를 하루 3회 도포하도록 안내함. 피부 자극을 줄이기 위해 뜨거운 물 세안은 피하도록 설명함.'}
              autoFocus
            />

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting || !remark.trim()}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
