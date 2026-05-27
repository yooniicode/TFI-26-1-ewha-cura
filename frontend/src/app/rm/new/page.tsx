'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
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

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatStartedAt(date: Date) {
  const month = date.getMonth() + 1
  const day = String(date.getDate()).padStart(2, '0')
  const dow = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${month}.${day} (${dow}) ${formatTime(date)}`
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

  const [startedAt] = useState(() => new Date())
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [savedCid, setSavedCid] = useState<string | null>(cid)
  const savedCidRef = useRef<string | null>(cid)
  const [autoSaving, setAutoSaving] = useState(false)
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

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

  // ref pattern: always captures latest state without stale closures
  const autoSaveRef = useRef<() => Promise<void>>(async () => {})
  autoSaveRef.current = async () => {
    if (!patientId || !remark.trim()) return
    setAutoSaving(true)
    try {
      if (savedCid) {
        // consultation이 null이어도 기본값으로 update
        await consultationApi.update(savedCid, {
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
          workDescription: remark,
          doctorConfirmationSignature: consultation?.doctorConfirmationSignature ?? '',
          memo: consultation?.memo ?? '',
        })
      } else {
        const res = await consultationApi.create({
          patientId,
          consultationDate: new Date().toISOString().split('T')[0],
          issueType: 'MEDICAL',
          processing: 'INTERPRETATION',
          workDescription: remark,
        })
        const c = res.payload
        if (c?.id) {
          savedCidRef.current = c.id
          setSavedCid(c.id)
          setConsultation(c)
        }
      }
      setLastSavedAt(new Date())
    } catch { /* silent */ }
    setAutoSaving(false)
  }

  useEffect(() => {
    const interval = setInterval(() => { autoSaveRef.current() }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleGoToReport() {
    setSubmitting(true)
    setError('')
    try {
      await autoSaveRef.current()

      if (remark.trim()) {
        setAiStatus('loading')
        try {
          const res = await fetch('/api/parse-rm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmText: remark }),
          })
          if (res.ok) {
            const data = await res.json() as { fields: Record<string, string> | null; error?: string; provider?: string }
            console.log('[RM] parse-rm 응답:', JSON.stringify(data))
            if (data.fields) {
              sessionStorage.setItem('rm_parsed_fields', JSON.stringify(data.fields))
              setAiStatus('ok')
            } else {
              console.warn('[RM] AI 파싱 결과 없음:', data.error)
              setAiStatus('fail')
            }
          } else {
            console.warn('[RM] /api/parse-rm 응답 오류:', res.status)
            setAiStatus('fail')
          }
        } catch (e) {
          console.error('[RM] AI 파싱 fetch 실패:', e)
          setAiStatus('fail')
        }
      }

      const targetCid = savedCidRef.current
      router.push(`/consultations/new?patientId=${patientId}${targetCid ? `&cid=${targetCid}` : ''}`)
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

  const patientRequest = consultation?.patientComment?.trim()
  const patientFirstName = patientName.split(' ')[0]

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

      {/* 메인 */}
      <div className="bg-neutral-100 px-4 py-4 min-h-screen">
        <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-4">

          {/* 이번 진료 + 작성 시작 */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-[#161616] text-base font-medium">이번진료</span>
              <span className="text-[#5D5D5D] text-base">{contextDate}</span>
              {contextLocation && (
                <span className="text-[#5D5D5D] text-sm max-w-[180px]">{contextLocation}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[#A0A0A0] text-xs">작성 시작</span>
              <span className="text-[#5D5D5D] text-sm font-medium">{formatStartedAt(startedAt)}</span>
            </div>
          </div>

          {/* 환자 사전 요청사항 */}
          {patientRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-amber-700 tracking-wide">
                {patientFirstName ? `${patientFirstName}씨 사전 요청사항` : '환자 사전 요청사항'}
              </span>
              <p className="text-sm text-[#424242] leading-relaxed whitespace-pre-wrap">{patientRequest}</p>
            </div>
          )}

          {/* Remark 입력 */}
          <textarea
            className="w-full min-h-[300px] px-4 py-6 bg-[#F3F9FF] rounded-lg border border-[#D1E8FF] text-[#161616] text-base leading-relaxed resize-none focus:outline-none focus:border-blue-400 placeholder:text-[#808080]"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder={'예시\n\n얼굴에 1도 화상으로 내원함. 처방받은 연고를 하루 3회 도포하도록 안내함. 피부 자극을 줄이기 위해 뜨거운 물 세안은 피하도록 설명함.'}
            autoFocus
          />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* 저장 상태 + 수동 저장 버튼 */}
          <div className="flex items-center justify-between">
            <div className="h-4">
              {autoSaving ? (
                <span className="text-xs text-gray-400">저장 중...</span>
              ) : lastSavedAt ? (
                <span className="text-xs text-gray-400">저장됨 {formatTime(lastSavedAt)}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => autoSaveRef.current()}
              disabled={autoSaving || !remark.trim()}
              className="text-xs text-blue-500 font-medium disabled:opacity-40 hover:underline"
            >
              지금 저장
            </button>
          </div>

          {/* AI 상태 */}
          {aiStatus !== 'idle' && (
            <div className={`text-center text-xs py-1 rounded ${
              aiStatus === 'loading' ? 'text-blue-500' :
              aiStatus === 'ok' ? 'text-green-600' :
              'text-red-400'
            }`}>
              {aiStatus === 'loading' && 'AI가 RM을 분석하는 중...'}
              {aiStatus === 'ok' && 'AI 분석 완료 — 보고서 칸에 자동 입력됩니다'}
              {aiStatus === 'fail' && 'AI 분석 실패 — 보고서에서 직접 입력해주세요 (콘솔 확인)'}
            </div>
          )}

          {/* 보고서 쓰기 */}
          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleGoToReport}
            disabled={submitting || aiStatus === 'loading'}
          >
            {submitting ? '저장 중...' : aiStatus === 'loading' ? 'AI 분석 중...' : '보고서 쓰기 →'}
          </button>

        </div>
      </div>
    </AppShell>
  )
}
