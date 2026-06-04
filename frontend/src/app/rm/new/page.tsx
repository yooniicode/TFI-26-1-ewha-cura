'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import PatientInfoBar, { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
import { consultationApi, patientApi } from '@/lib/api'
import type { Consultation, Patient } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

function getKSTDateStr() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().split('T')[0]
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

function consultDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
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
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''
  const cid = searchParams.get('cid')

  if (!patientId) return <RmPatientSelect />

  return <RmMemoEditor patientId={patientId} cid={cid} />
}

// ─── 환자 선택 화면 ────────────────────────────────────────────────────────────

function RmPatientSelect() {
  const router = useRouter()
  const labels = useEnumLabels()
  const { t } = useTranslation()
  const todayStr = getKSTDateStr()

  const { data: allConsultations = [] } = useQuery<Consultation[]>({
    queryKey: queryKeys.consultations.list(0),
    queryFn: () => consultationApi.list(0).then(r => r.payload ?? []),
  })
  const { data: allPatients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: queryKeys.patients.list(0),
    queryFn: () => patientApi.list(0).then(r => r.payload ?? []),
  })

  const todayConsultations = allConsultations.filter(c => c.consultationDate === todayStr)
  const assignedPatients = allPatients.filter(p => p.assignedToMe)

  return (
    <AppShell noPadding>
      <PageHeader title={t.realtime_memo.title} showClose onClose={() => router.back()} />
      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-4">

        {/* 오늘 진료 예정 */}
        {todayConsultations.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">오늘 진료 예정</p>
            <div className="space-y-2">
              {todayConsultations.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/rm/new?patientId=${c.patientId}&cid=${c.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-4 hover:bg-[#f3f9ff] transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <img
                      src={c.patientGender === 'FEMALE'
                        ? '/icons/common/gender/small-여성-배경o.svg'
                        : '/icons/common/gender/small-남성-배경o.svg'}
                      alt="" width={36} height={36}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-[#161616] truncate">{c.patientName}</p>
                    <p className="text-sm text-[#808080]">
                      {[c.hospitalName, c.department].filter(Boolean).join(' ') || '병원 미정'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#2592FF] bg-[#EAF4FF] rounded-full px-2.5 py-1 shrink-0">오늘</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {todayConsultations.length > 0 && assignedPatients.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E0E0E0]" />
            <span className="text-xs text-[#A0A0A0] shrink-0">담당 환자</span>
            <div className="flex-1 h-px bg-[#E0E0E0]" />
          </div>
        )}

        {/* 담당 환자 목록 */}
        {patientsLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : assignedPatients.length === 0 && todayConsultations.length === 0 ? (
          <div className="bg-white rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#A0A0A0]">담당 환자가 없습니다</p>
          </div>
        ) : (
          <section>
            {todayConsultations.length === 0 && (
              <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">담당 환자</p>
            )}
            <div className="space-y-2">
              {assignedPatients.map(p => {
                const flag = getFlagSrc(p.nationality)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => router.push(`/rm/new?patientId=${p.id}`)}
                    className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-4 hover:bg-[#f3f9ff] transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={p.gender === 'FEMALE'
                          ? '/icons/common/gender/small-여성-배경o.svg'
                          : '/icons/common/gender/small-남성-배경o.svg'}
                        alt="" width={36} height={36}
                      />
                      {flag && <img src={flag} alt="" width={12} height={12} className="absolute -bottom-0.5 -right-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[#161616] truncate">{p.name}</p>
                      <p className="text-sm text-[#808080]">{labels.nationality[p.nationality]}</p>
                    </div>
                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
                      <path d="M1 1l6 6-6 6" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

// ─── 메모 작성 화면 ───────────────────────────────────────────────────────────

function RmMemoEditor({ patientId, cid }: { patientId: string; cid: string | null }) {
  const router = useRouter()
  const labels = useEnumLabels()
  const { t } = useTranslation()

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

  const autoSaveRef = useRef<() => Promise<void>>(async () => {})
  autoSaveRef.current = async () => {
    if (!patientId || !remark.trim()) return
    setAutoSaving(true)
    try {
      if (savedCid) {
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
            const data = await res.json() as { fields: Record<string, string> | null; error?: string }
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
  const ageStr = calcAge(patient?.birthDate)
  const demographics = patient
    ? [
        labels.nationality[patient.nationality],
        labels.gender[patient.gender],
        ageStr,
      ].filter(Boolean).join(' | ')
    : ''

  const patientRequest = consultation?.patientComment?.trim()
  const patientFirstName = patientName.split(' ')[0]
  const flagSrc = patient ? getFlagSrc(patient.nationality) : undefined

  return (
    <AppShell noPadding>
      <PageHeader title={t.realtime_memo.title} showClose onClose={() => router.back()} />

      {/* 환자 정보 바 — 클릭 시 환자 프로필로 이동 */}
      <PatientInfoBar
        patientId={patientId || null}
        patientName={patientName}
        subtitle={demographics}
        flagSrc={flagSrc}
      />

      {/* 메인 */}
      <div className="bg-neutral-100 px-4 py-4 min-h-screen">
        <div className="bg-white rounded-xl px-4 py-5 flex flex-col gap-4">

          {/* 이번 진료 + 작성 시작 */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-[#161616] text-base font-medium">{t.realtime_memo.this_consultation}</span>
              <span className="text-[#5D5D5D] text-base">{contextDate}</span>
              {contextLocation && (
                <span className="text-[#5D5D5D] text-sm max-w-[180px]">{contextLocation}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[#A0A0A0] text-xs">{t.realtime_memo.started_at}</span>
              <span className="text-[#5D5D5D] text-sm font-medium">{formatStartedAt(startedAt)}</span>
            </div>
          </div>

          {/* 환자 사전 요청사항 */}
          {patientRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-amber-700 tracking-wide">
                {patientFirstName ? t.realtime_memo.patient_request_prefix(patientFirstName) : t.realtime_memo.patient_request_default}
              </span>
              <p className="text-sm text-[#424242] leading-relaxed whitespace-pre-wrap">{patientRequest}</p>
            </div>
          )}

          {/* 메모 입력 */}
          <textarea
            className="w-full min-h-[300px] px-4 py-6 bg-[#F3F9FF] rounded-lg border border-[#D1E8FF] text-[#161616] text-base leading-relaxed resize-none focus:outline-none focus:border-blue-400 placeholder:text-[#808080]"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder={t.realtime_memo.placeholder}
            autoFocus
          />

          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* 저장 상태 */}
          <div className="flex items-center justify-between">
            <div className="h-4">
              {autoSaving ? (
                <span className="text-xs text-gray-400">{t.realtime_memo.saving}</span>
              ) : lastSavedAt ? (
                <span className="text-xs text-gray-400">{t.realtime_memo.saved(formatTime(lastSavedAt))}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => autoSaveRef.current()}
              disabled={autoSaving || !remark.trim()}
              className="text-xs text-[#2592FF] font-medium disabled:opacity-40 hover:underline"
            >
              {t.realtime_memo.save_now}
            </button>
          </div>

          {/* AI 상태 */}
          {aiStatus !== 'idle' && (
            <div className={`text-center text-xs py-1 rounded ${
              aiStatus === 'loading' ? 'text-[#2592FF]' :
              aiStatus === 'ok' ? 'text-green-600' :
              'text-red-400'
            }`}>
              {aiStatus === 'loading' && t.realtime_memo.ai_analyzing}
              {aiStatus === 'ok' && t.realtime_memo.ai_done}
              {aiStatus === 'fail' && t.realtime_memo.ai_fail}
            </div>
          )}

          {/* 보고서 쓰기 */}
          <button
            type="button"
            className="w-full h-[54px] bg-[#2592FF] rounded-lg text-base font-semibold text-white disabled:opacity-40 transition-opacity"
            onClick={handleGoToReport}
            disabled={submitting || aiStatus === 'loading'}
          >
            {submitting ? t.realtime_memo.saving_btn : aiStatus === 'loading' ? t.realtime_memo.ai_analyzing_btn : t.realtime_memo.write_report}
          </button>

        </div>
      </div>
    </AppShell>
  )
}
