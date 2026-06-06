'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import Link from 'next/link'
import { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
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

function formatAutoSaveDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
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
        console.log(`[rm:parse] 파싱 요청 len=${remark.length}`)
        try {
          const res = await fetch('/api/parse-rm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rmText: remark }),
          })
          if (res.ok) {
            const data = await res.json() as { fields: Record<string, string> | null; provider?: string; error?: string }
            if (data.fields) {
              const filled = Object.entries(data.fields).filter(([, v]) => !!v).map(([k]) => k)
              console.log(`[rm:parse] 완료 provider=${data.provider ?? '?'} filled=[${filled.join(',')}]`)
              sessionStorage.setItem('rm_parsed_fields', JSON.stringify(data.fields))
              console.log('[rm:parse] sessionStorage 저장 완료')
              setAiStatus('ok')
            } else {
              console.warn('[rm:parse] 파싱 결과 없음 (fields=null)', data.error ?? '')
              setAiStatus('fail')
            }
          } else {
            console.warn(`[rm:parse] HTTP 오류 status=${res.status}`)
            setAiStatus('fail')
          }
        } catch (e) {
          console.error('[rm:parse] 네트워크 오류:', e instanceof Error ? e.message : e)
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
  const genderIcon = patient
    ? (patient.gender === 'FEMALE'
        ? '/icons/common/gender/small-여성-배경o.svg'
        : '/icons/common/gender/small-남성-배경o.svg')
    : (consultation?.patientGender === 'FEMALE'
        ? '/icons/common/gender/small-여성-배경o.svg'
        : '/icons/common/gender/small-남성-배경o.svg')

  return (
    <AppShell noPadding>
      <PageHeader title={t.realtime_memo.title} showClose onClose={() => router.back()} />

      {/* 이번진료 */}
      <div className="bg-white px-4 py-4 border-b border-[#eee]">
        <p className="text-[16px] text-[#808080] mb-1">이번진료</p>
        <p className="text-[18px] font-medium text-[#161616]">{contextDate}</p>
        {contextLocation && (
          <p className="text-[18px] font-medium text-[#161616]">{contextLocation}</p>
        )}
      </div>

      {/* 환자 정보 */}
      <div className="bg-white border-b border-[#eee] px-4 py-3 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-2 active:opacity-70 transition-opacity"
        >
          <img src={genderIcon} alt="" width={24} height={24} />
          <span className="text-[18px] font-medium text-[#161616]">{patientName}</span>
          {ageStr && <span className="text-[18px] text-[#494949]">{ageStr}</span>}
          <img src="/icons/common/arrows/right.svg" alt="" width={20} height={20} className="ml-auto" />
        </Link>
        {patientRequest && (
          <div className="bg-[#f7f7f7] rounded-bl-[20px] rounded-br-[20px] rounded-tr-[20px] px-4 py-3">
            <p className="text-[14px] font-medium text-[#494949] leading-relaxed">{patientRequest}</p>
          </div>
        )}
      </div>

      {/* 메모 입력 영역 */}
      <div className="bg-[#f7f7f7] px-4 py-4 pb-28 min-h-screen">
        <div className="bg-white border border-[#eee] rounded-[8px] p-4 flex flex-col gap-3">
          <textarea
            className="w-full min-h-[394px] resize-none focus:outline-none text-[18px] text-[#161616] leading-relaxed placeholder:text-[#808080]"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder={t.realtime_memo.placeholder}
            autoFocus
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* 자동저장 표시 */}
          {lastSavedAt && (
            <div className="flex justify-end items-center gap-1">
              <span className="text-[14px] text-[#808080]">{formatAutoSaveDate(lastSavedAt)}</span>
              <span className="text-[14px] text-[#2592ff]">자동저장 되었습니다</span>
            </div>
          )}
        </div>

        {/* AI 상태 */}
        {aiStatus !== 'idle' && (
          <div className={`text-center text-sm py-2 mt-2 ${
            aiStatus === 'loading' ? 'text-[#2592FF]' :
            aiStatus === 'ok' ? 'text-green-600' :
            'text-red-400'
          }`}>
            {aiStatus === 'loading' && t.realtime_memo.ai_analyzing}
            {aiStatus === 'ok' && t.realtime_memo.ai_done}
            {aiStatus === 'fail' && t.realtime_memo.ai_fail}
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 pb-8 pt-3 z-10">
        <button
          type="button"
          className={`w-full h-[60px] rounded-[8px] text-[18px] font-semibold transition-colors ${
            remark.trim()
              ? 'bg-[#2592FF] text-white'
              : 'bg-[#f0f1f5] text-[#a1a1a1]'
          }`}
          onClick={handleGoToReport}
          disabled={submitting || aiStatus === 'loading'}
        >
          {submitting ? t.realtime_memo.saving_btn : aiStatus === 'loading' ? t.realtime_memo.ai_analyzing_btn : '작성 완료'}
        </button>
      </div>
    </AppShell>
  )
}
