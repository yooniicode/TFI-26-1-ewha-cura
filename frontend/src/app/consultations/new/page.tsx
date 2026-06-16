'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import ReportExitModal from '@/components/ui/ReportExitModal'
import PatientInfoBar, { getFlagSrc } from '@/components/patient/PatientInfoBar'
import StepIndicator from '@/components/ui/StepIndicator'
import { consultationApi, patientApi } from '@/lib/api'
import type { Consultation, Patient } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { formatKoreanDate, parseAppDate } from '@/lib/utils/dateFormat'
import { CalendarPicker, TimeScrollPicker } from '@/components/ui/DateTimePicker'
import { useSpeechToText } from '@/hooks/useSpeechToText'

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}세`
}

export default function ConsultationNewPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <ReportWriteInner />
    </Suspense>
  )
}

function ReportWriteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patientId') ?? ''
  const rmCid = searchParams.get('cid')

  const { t } = useTranslation()
  const tc = t.consultation
  const labels = useEnumLabels()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [recentHistory, setRecentHistory] = useState<Consultation[]>([])
  const [rmConsultation, setRmConsultation] = useState<Consultation | null>(null)
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)

  // Step 1 (처음부터 작성하기 전용)
  const [workDescription, setWorkDescription] = useState('')
  // Step 2
  const [consultationDate, setConsultationDate] = useState(() =>
    new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
  )
  const [hospitalName, setHospitalName] = useState('')
  const [department, setDepartment] = useState('')
  // Step 3
  const [patientComment, setPatientComment] = useState('')
  const [diagnosisNameCode, setDiagnosisNameCode] = useState('')
  const [diagnosisContent, setDiagnosisContent] = useState('')
  const [treatmentResult, setTreatmentResult] = useState('')
  // Step 4 (merged with step 3 — shown on same scrollable screen)
  const [medicationInstruction, setMedicationInstruction] = useState('')
  const [nextAppointmentDate, setNextAppointmentDate] = useState('')
  const [nextAppointmentTime, setNextAppointmentTime] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [aiParsing, setAiParsing] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  // 메모에서 온 경우 step 1 건너뜀; 5번+6번을 하나의 스크린(5번)으로 합침
  const fromMemo = !!rmCid
  const TOTAL_STEPS = fromMemo ? 2 : 3
  const isLastStep = step === TOTAL_STEPS
  // 스텝 인디케이터 매핑: fromMemo → 4,5 / 처음부터 → 3,4,5 (총 5단계)
  const stepLabel = fromMemo ? step + 3 : step + 2

  function applyParsedFields(fields: Record<string, string>) {
    if (fields.diagnosisNameCode) setDiagnosisNameCode(fields.diagnosisNameCode)
    if (fields.diagnosisContent) setDiagnosisContent(fields.diagnosisContent)
    if (fields.treatmentResult) setTreatmentResult(fields.treatmentResult)
    if (fields.medicationInstruction) setMedicationInstruction(fields.medicationInstruction)
    // YYYY-MM-DD 형식만 허용 (AI가 "6개월 후" 같은 비날짜 문자열을 반환하면 NaN 버그 발생)
    if (fields.nextAppointmentDate && /^\d{4}-\d{2}-\d{2}$/.test(fields.nextAppointmentDate)) {
      setNextAppointmentDate(fields.nextAppointmentDate)
    }
    if (fields.nextAppointmentTime && /^\d{2}:\d{2}$/.test(fields.nextAppointmentTime)) {
      setNextAppointmentTime(fields.nextAppointmentTime)
    }
    if (fields.department) setDepartment(fields.department)
    if (fields.hospitalName) setHospitalName(fields.hospitalName)
    if (fields.patientComment) setPatientComment(fields.patientComment)
  }

  async function parseWithClaude(rmText: string) {
    setAiParsing(true)
    console.log(`[new:parse] 자동 파싱 시작 len=${rmText.length}`)
    try {
      const res = await fetch('/api/parse-rm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmText }),
      })
      if (res.ok) {
        const data = await res.json() as { fields: Record<string, string> | null; provider?: string }
        if (data.fields) {
          const filled = Object.entries(data.fields).filter(([, v]) => !!v).map(([k]) => k)
          console.log(`[new:parse] 자동 파싱 완료 provider=${data.provider ?? '?'} filled=[${filled.join(',')}]`)
          applyParsedFields(data.fields)
        } else {
          console.warn('[new:parse] 자동 파싱 결과 없음 (fields=null)')
        }
      } else {
        console.warn(`[new:parse] 자동 파싱 HTTP 오류 status=${res.status}`)
      }
    } catch (e) {
      console.error('[new:parse] 자동 파싱 네트워크 오류:', e instanceof Error ? e.message : e)
    }
    setAiParsing(false)
  }

  useEffect(() => {
    if (!patientId) return
    patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    // 활성 배정 없이도 본인 consultation 목록에서 해당 환자 기록 조회
    consultationApi.list({ page: 0, sortBy: 'consultationDate', direction: 'desc' })
      .then(r => setRecentHistory((r.payload ?? []).filter(c => c.patientId === patientId)))
      .catch(() => {})
  }, [patientId])

  useEffect(() => {
    if (!rmCid) return
    consultationApi.get(rmCid).then(r => {
      const c = r.payload ?? null
      setRmConsultation(c)
      if (c?.workDescription) setWorkDescription(c.workDescription)
      if (c?.hospitalName) setHospitalName(c.hospitalName)
      if (c?.department) setDepartment(c.department)
      if (c?.consultationDate) {
        const dt = c.consultationDate.length === 10 ? `${c.consultationDate}T00:00` : c.consultationDate.slice(0, 16)
        setConsultationDate(dt)
      }
    }).catch(() => {})
  }, [rmCid])

  // sessionStorage에서 AI 파싱 결과 적용 (메모→편집→여기로 올 때)
  useEffect(() => {
    const raw = sessionStorage.getItem('rm_parsed_fields')
    if (raw) {
      sessionStorage.removeItem('rm_parsed_fields')
      try {
        const fields = JSON.parse(raw) as Record<string, string>
        const filled = Object.entries(fields).filter(([, v]) => !!v).map(([k]) => k)
        console.log(`[new:parse] sessionStorage 적용 filled=[${filled.join(',')}]`)
        applyParsedFields(fields)
      } catch (e) {
        console.error('[new:parse] sessionStorage 파싱 실패:', e instanceof Error ? e.message : e)
      }
    }
    // 자동저장 실패 폴백: 메모 내용을 진료메모 칸에 미리 채움
    const fallback = sessionStorage.getItem('rm_fallback_text')
    if (fallback) {
      sessionStorage.removeItem('rm_fallback_text')
      setWorkDescription(fallback)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 직접 진입 시 (메모 경로 아닐 때): 최근 RM 자동 로드
  useEffect(() => {
    if (recentHistory.length === 0) return
    if (sessionStorage.getItem('rm_parsed_fields')) return
    if (rmCid) return

    const recentRm = recentHistory.find(c => c.workDescription?.trim())
    if (!recentRm?.workDescription) return
    setWorkDescription(recentRm.workDescription)
    parseWithClaude(recentRm.workDescription)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentHistory])

  async function handleSave() {
    if (!patientId) return
    setSubmitting(true)
    setError('')
    try {
      if (rmCid && rmConsultation) {
        await consultationApi.update(rmCid, {
          consultationDate: consultationDate || null,
          patientId: rmConsultation.patientId,
          hospitalId: rmConsultation.hospitalId ?? null,
          hospitalName: hospitalName || rmConsultation.hospitalName || '',
          department: department || rmConsultation.department || '',
          doctorName: rmConsultation.doctorName || '',
          issueType: rmConsultation.issueType,
          method: rmConsultation.method ?? null,
          processing: rmConsultation.processing ?? 'INTERPRETATION',
          patientComment: patientComment || rmConsultation.patientComment || '',
          treatmentResult: treatmentResult || '',
          diagnosisContent: diagnosisContent || '',
          diagnosisNameCode: diagnosisNameCode || rmConsultation.diagnosisNameCode || '',
          medicationInstruction: medicationInstruction || '',
          nextAppointmentDate: /^\d{4}-\d{2}-\d{2}$/.test(nextAppointmentDate) ? nextAppointmentDate : null,
          nextAppointmentTime: nextAppointmentTime || null,
          counselorName: rmConsultation.counselorName || '',
          durationHours: rmConsultation.durationHours ?? null,
          fee: rmConsultation.fee ?? null,
          workDescription: workDescription || '',
          doctorConfirmationSignature: rmConsultation.doctorConfirmationSignature || '',
          memo: rmConsultation.memo || '',
          reportCompleted: true,
        })
      } else {
        const created = await consultationApi.create({
          patientId,
          consultationDate,
          issueType: 'MEDICAL',
          processing: 'INTERPRETATION',
          workDescription: workDescription || undefined,
          patientComment: patientComment || undefined,
          diagnosisNameCode: diagnosisNameCode || undefined,
          diagnosisContent: diagnosisContent || undefined,
          treatmentResult: treatmentResult || undefined,
          medicationInstruction: medicationInstruction || undefined,
          nextAppointmentDate: /^\d{4}-\d{2}-\d{2}$/.test(nextAppointmentDate) ? nextAppointmentDate : undefined,
          nextAppointmentTime: nextAppointmentTime || undefined,
          department: department || undefined,
          hospitalName: hospitalName || undefined,
        })
        // 신규 생성 후 reportCompleted 표시
        if (created.payload?.id) {
          await consultationApi.update(created.payload.id, {
            consultationDate,
            patientId,
            issueType: 'MEDICAL',
            processing: 'INTERPRETATION',
            reportCompleted: true,
          })
        }
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : tc.err_save)
      setSubmitting(false)
    }
  }

  const ageStr = calcAge(patient?.birthDate)
  const patientName = patient?.name ?? ''
  const demographics = patient
    ? [labels.nationality[patient.nationality], labels.gender[patient.gender], ageStr].filter(Boolean).join(' | ')
    : ''
  const flagSrc = patient ? getFlagSrc(patient.nationality) : undefined

  // 완료 화면 (762-1680)
  if (done) {
    return (
      <AppShell noPadding>
        <PageHeader title={tc.write_report} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <img src="/icons/common/completion-graphic.svg" width={172} height={172} alt="" className="mx-auto" />
          <p className="text-[24px] font-semibold text-[#161616] leading-[1.4] mt-8">
            {tc.report_done}
          </p>
          <p className="mt-2.5 text-[18px] font-medium text-[#494949]">{tc.well_done}</p>
        </div>
        <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8">
          <button
            onClick={() => router.replace('/dashboard')}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white"
          >
            {tc.go_home}
          </button>
        </div>
      </AppShell>
    )
  }

  const FILL_TITLE = tc.step_fill
  const stepTitles: Record<number, string> = fromMemo
    ? { 1: FILL_TITLE, 2: FILL_TITLE, 3: FILL_TITLE }
    : { 1: tc.step_memo, 2: FILL_TITLE, 3: FILL_TITLE, 4: FILL_TITLE }

  const title = stepTitles[step] ?? ''

  return (
    <AppShell noPadding>
      <PageHeader title={tc.write_report} showClose onClose={() => setShowExitModal(true)} />

      {/* 환자 정보 바 */}
      <PatientInfoBar
        patientId={patientId || null}
        patientName={patientName}
        subtitle={demographics}
        flagSrc={flagSrc}
      />

      {/* 타이틀 */}
      <div className="bg-white px-4 pt-8 pb-0">
        <h2 className="text-[26px] font-semibold text-[#161616] leading-[1.4] whitespace-pre-line">
          {title}
        </h2>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="bg-white px-4 pt-4 pb-5">
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => i + 1).map(n => {
            const isDone = n < stepLabel
            const isActive = n === stepLabel
            return (
              <div
                key={n}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  isActive ? 'bg-[#2592FF] text-white' : isDone ? 'bg-[#f3f9ff]' : 'bg-[#F7F7F7] text-[#808080]'
                }`}
              >
                {isDone ? (
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path d="M1 4.5L4.5 8L11 1" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : n}
              </div>
            )
          })}
        </div>
      </div>

      {/* 스텝별 컨텐츠 */}
      <div className="bg-white px-4 pt-2 pb-36">
        {!fromMemo && step === 1 && (
          <Step1Scratch
            workDescription={workDescription}
            onChange={setWorkDescription}
            aiParsing={aiParsing}
          />
        )}
        {(fromMemo ? step === 1 : step === 2) && (
          <StepDate
            consultationDate={consultationDate}
            hospitalName={hospitalName}
            department={department}
            onDateChange={setConsultationDate}
            onHospitalChange={setHospitalName}
            onDepartmentChange={setDepartment}
          />
        )}
        {isLastStep && (
          <div className="flex flex-col gap-8">
            <StepDiagnosis
              patientComment={patientComment}
              diagnosisNameCode={diagnosisNameCode}
              diagnosisContent={diagnosisContent}
              treatmentResult={treatmentResult}
              fromMemo={fromMemo}
              onPatientCommentChange={setPatientComment}
              onDiagnosisNameCodeChange={setDiagnosisNameCode}
              onDiagnosisChange={setDiagnosisContent}
              onTreatmentChange={setTreatmentResult}
            />
            <div className="-mx-4 h-2 bg-[#F7F7F7]" />
            <StepMedication
              medicationInstruction={medicationInstruction}
              nextAppointmentDate={nextAppointmentDate}
              nextAppointmentTime={nextAppointmentTime}
              fromMemo={fromMemo}
              onMedicationChange={setMedicationInstruction}
              onNextDateChange={setNextAppointmentDate}
              onNextTimeChange={setNextAppointmentTime}
            />
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8 flex gap-2.5">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-[111px] h-[60px] bg-[#F0F1F5] rounded-lg text-lg font-medium text-[#494949]"
          >
            {t.common.prev_page}
          </button>
        )}
        <button
          onClick={step < TOTAL_STEPS
            ? () => {
                // 처음부터 작성 step 1: 현재 workDescription으로 AI 파싱 트리거
                if (!fromMemo && step === 1 && workDescription.trim()) {
                  parseWithClaude(workDescription)
                }
                setStep(s => s + 1)
              }
            : handleSave}
          disabled={submitting || aiParsing}
          className="flex-1 h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white disabled:opacity-60"
        >
          {aiParsing ? tc.ai_analyzing : step < TOTAL_STEPS ? tc.next_step : submitting ? t.common.saving : tc.save_btn}
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

// ─── 공통 필드 컴포넌트 ──────────────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  const filled = value.trim().length > 0
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[#161616]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-4 rounded-lg text-lg text-[#161616] outline-none border ${
          filled ? 'border-[#A1A1A1]' : 'border-[#EEEEEE] bg-[#F7F7F7]'
        } placeholder:text-[#A0A0A0]`}
      />
    </div>
  )
}

function FieldTextarea({ label, value, onChange, placeholder, fromMemo }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; fromMemo?: boolean
}) {
  const filled = value.trim().length > 0
  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[#161616]">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={`w-full px-4 py-4 rounded-lg text-lg text-[#161616] leading-relaxed resize-none outline-none border ${
          filled
            ? fromMemo ? 'border-[#2592FF]/30 bg-[#f3f9ff]' : 'border-[#A1A1A1]'
            : 'border-[#EEEEEE] bg-[#F7F7F7]'
        } placeholder:text-[#A0A0A0]`}
      />
    </div>
  )
}

// ─── 스텝 컴포넌트 ────────────────────────────────────────────────────────────

function Step1Scratch({ workDescription, onChange, aiParsing }: {
  workDescription: string; onChange: (v: string) => void; aiParsing: boolean
}) {
  const { t } = useTranslation()
  const tc = t.consultation

  const workDescriptionRef = useRef(workDescription)
  workDescriptionRef.current = workDescription
  const handleFinalTranscript = useCallback((text: string) => {
    const prev = workDescriptionRef.current
    const separator = prev && !prev.endsWith('\n') ? '\n' : ''
    onChange(prev + separator + text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  const stt = useSpeechToText(handleFinalTranscript)

  return (
    <div className="flex flex-col gap-3">
      {aiParsing && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 rounded-[8px] border border-blue-100">
          <svg className="animate-spin w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm text-blue-600">{tc.ai_parsing}</span>
        </div>
      )}
      <div className="bg-white border border-[#eee] rounded-[8px] p-4 flex flex-col gap-3">
        <textarea
          value={workDescription}
          onChange={e => onChange(e.target.value)}
          placeholder={tc.scratch_ph}
          className="w-full min-h-[394px] resize-none outline-none text-[18px] text-[#161616] leading-relaxed placeholder:text-[#a1a1a1]"
          autoFocus
        />

        {stt.supported && (
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-[#f0f0f0]">
            {stt.interim && (
              <p className="w-full text-[15px] text-[#808080] leading-relaxed px-1 text-left">
                {stt.interim}
                <span className="inline-block w-1 h-4 ml-0.5 bg-[#2592FF] animate-pulse align-middle" />
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={stt.recording ? stt.stop : stt.start}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  stt.recording ? 'bg-red-500' : 'bg-[#2592FF]'
                }`}
              >
                {stt.recording ? (
                  <span className="w-4 h-4 rounded-sm bg-white" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
              <span className={`text-[13px] font-medium ${stt.recording ? 'text-red-500' : 'text-[#A0A0A0]'}`}>
                {stt.recording ? '녹음 중... (탭하여 중지)' : '탭하여 음성 입력'}
              </span>
              {stt.recording && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepDate({ consultationDate, hospitalName, department, onDateChange, onHospitalChange, onDepartmentChange }: {
  consultationDate: string; hospitalName: string; department: string;
  onDateChange: (v: string) => void; onHospitalChange: (v: string) => void; onDepartmentChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const tc = t.consultation
  const dateOnly = consultationDate.slice(0, 10)
  const timeOnly = consultationDate.length >= 16 ? consultationDate.slice(11, 16) : ''
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-[#161616]">{tc.visit_datetime}</label>
        <CalendarPicker
          value={dateOnly}
          onChange={d => onDateChange(`${d}T${timeOnly || '00:00'}`)}
          time={timeOnly}
          onTimeChange={tm => onDateChange(`${dateOnly}T${tm}`)}
        />
      </div>

      {/* 병원 검색 (HIRA 병원정보서비스) */}
      <HospitalSearchField value={hospitalName} onChange={onHospitalChange} />

      <FieldInput label={tc.visit_dept} value={department} onChange={onDepartmentChange} placeholder={tc.visit_dept_ph} />
    </div>
  )
}

// ─── 병원 검색 필드 (HIRA 병원정보서비스) ────────────────────────────────────

interface HospResult { name: string; address: string; phone: string; type: string }

function HospitalSearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  const tc = t.consultation
  const [query, setQuery] = useState('')
  const [directInput, setDirectInput] = useState('')
  const [mode, setMode] = useState<'search' | 'direct'>('search')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<HospResult[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true); setSearchErr(''); setResults([])
    try {
      const res = await fetch(`/api/hospital-search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { results: HospResult[] }
      if (data.results.length === 0) {
        setSearchErr(t.common.no_result)
      } else {
        setResults(data.results)
        setShowPopup(true)
      }
    } catch {
      setSearchErr(tc.search_failed)
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(r: HospResult) {
    onChange(r.name)
    setShowPopup(false)
    setQuery('')
  }

  function handleDirectConfirm() {
    const v = directInput.trim()
    if (!v) return
    onChange(v)
    setDirectInput('')
    setMode('search')
  }

  function handleClear() {
    onChange('')
    setDirectInput('')
    setMode('search')
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[#161616]">
        {tc.hospital}
        {mode === 'direct'
          ? <span className="ml-1 text-xs text-[#2592FF] font-normal">{tc.hosp_direct_badge}</span>
          : <span className="ml-1 text-xs text-[#A0A0A0] font-normal">{tc.hosp_hira_badge}</span>}
      </label>

      {/* 선택된 병원 */}
      {value && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-[#A1A1A1] bg-white">
          <span className="text-base text-[#161616] flex-1">{value}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-[#A0A0A0] hover:text-red-500 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* HIRA 검색 모드 */}
      {!value && mode === 'search' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tc.hosp_search_ph}
            className="flex-1 px-4 py-3.5 rounded-lg text-base text-[#161616] outline-none border border-[#EEEEEE] bg-[#F7F7F7] placeholder:text-[#A0A0A0]"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-4 py-2 bg-[#2592FF] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors shrink-0"
          >
            {searching ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : t.common.search}
          </button>
        </div>
      )}

      {!value && mode === 'search' && (
        <p className="text-xs text-[#A0A0A0]">{tc.hosp_search_hint}</p>
      )}

      {/* 직접 입력 모드 */}
      {!value && mode === 'direct' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={directInput}
            onChange={e => setDirectInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleDirectConfirm()}
            placeholder={tc.hosp_direct_ph}
            autoFocus
            className="flex-1 px-4 py-3.5 rounded-lg text-base text-[#161616] outline-none border border-[#2592FF] bg-white placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/20"
          />
          <button
            type="button"
            onClick={handleDirectConfirm}
            disabled={!directInput.trim()}
            className="px-4 py-2 bg-[#2592FF] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors shrink-0"
          >
            {t.common.confirm}
          </button>
        </div>
      )}

      {/* 모드 전환 버튼 */}
      {!value && (
        <button
          type="button"
          onClick={() => { setMode(m => m === 'search' ? 'direct' : 'search'); setSearchErr('') }}
          className="text-xs text-[#A0A0A0] hover:text-[#2592FF] text-left transition-colors"
        >
          {mode === 'search' ? tc.hosp_switch_direct : tc.hosp_switch_hira}
        </button>
      )}

      {searchErr && <p className="text-xs text-red-500">{searchErr}</p>}

      {/* 검색 결과 팝업 */}
      {showPopup && results.length > 0 && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowPopup(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-white rounded-t-3xl px-5 py-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold text-[#161616]">{tc.hosp_result_title}</p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">{tc.hosp_result_source}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F5] text-[#808080]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-start gap-3 bg-[#F8F9FF] hover:bg-[#EEF3FF] border border-[#E0E8FF] rounded-2xl px-4 py-4 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#2592FF] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-[#161616] leading-snug">{r.name}</p>
                    {r.type && <p className="text-xs text-[#2592FF] mt-0.5">{r.type}</p>}
                    {r.address && <p className="text-xs text-[#808080] mt-1 leading-relaxed">{r.address}</p>}
                    {r.phone && <p className="text-xs text-[#808080]">{r.phone}</p>}
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0 mt-1">
                    <path d="M1 1l6 6-6 6" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-[#A0A0A0] mt-4">
              {tc.hosp_result_footer}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function StepDiagnosis({
  patientComment, diagnosisNameCode, diagnosisContent, treatmentResult, fromMemo,
  onPatientCommentChange, onDiagnosisNameCodeChange, onDiagnosisChange, onTreatmentChange,
}: {
  patientComment: string; diagnosisNameCode: string; diagnosisContent: string; treatmentResult: string; fromMemo?: boolean;
  onPatientCommentChange: (v: string) => void
  onDiagnosisNameCodeChange: (v: string) => void
  onDiagnosisChange: (v: string) => void
  onTreatmentChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const tc = t.consultation
  return (
    <div className="flex flex-col gap-5">
      {fromMemo && (diagnosisContent || patientComment || treatmentResult) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
          <img src="/icons/interpreter/report/check.svg" alt="" width={16} height={16} />
          <span className="text-sm text-blue-600 font-medium">{tc.ai_auto_filled}</span>
        </div>
      )}
      <div className="bg-[#F3F9FF] rounded-lg px-3 py-2 text-xs text-[#2592FF] font-medium">
        💬 아래 내용은 <strong>환자 모국어로 작성</strong>해주세요. AI가 한국어로 번역해 센터장에게 전달됩니다.
      </div>
      <FieldTextarea label={tc.symptom_field} value={patientComment} onChange={onPatientCommentChange}
        placeholder={tc.symptom_ph} fromMemo={fromMemo} />

      {/* 병명 검색 (HIRA API) */}
      <DiseaseSearchField
        value={diagnosisNameCode}
        onChange={onDiagnosisNameCodeChange}
        fromMemo={fromMemo}
      />

      <FieldTextarea label={tc.doctor_diagnosis} value={diagnosisContent} onChange={onDiagnosisChange}
        placeholder={tc.doctor_diagnosis_ph} fromMemo={fromMemo} />
      <FieldTextarea label={tc.caution_field} value={treatmentResult} onChange={onTreatmentChange}
        placeholder={tc.caution_ph} fromMemo={fromMemo} />
    </div>
  )
}

// ─── 병명 검색 필드 (HIRA 질병정보 API) ─────────────────────────────────────

interface DiseaseResult { code: string; name: string }

function DiseaseSearchField({
  value, onChange, fromMemo,
}: {
  value: string; onChange: (v: string) => void; fromMemo?: boolean
}) {
  const { t } = useTranslation()
  const tc = t.consultation
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<DiseaseResult[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [searchErr, setSearchErr] = useState('')

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true); setSearchErr(''); setResults([])
    try {
      const res = await fetch(`/api/disease-search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as { results: DiseaseResult[] }
      if (data.results.length === 0) {
        setSearchErr(t.common.no_result)
      } else {
        setResults(data.results)
        setShowPopup(true)
      }
    } catch {
      setSearchErr(tc.search_failed)
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(r: DiseaseResult) {
    onChange(`${r.name} (${r.code})`)
    setShowPopup(false)
    setQuery('')
  }

  const filled = value.trim().length > 0

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[#161616]">
        {tc.disease_field}
        <span className="ml-1 text-xs text-[#A0A0A0] font-normal">{tc.hosp_hira_badge}</span>
      </label>

      {/* 현재 선택된 병명 */}
      {value && (
        <div className={`flex items-center justify-between gap-2 px-4 py-3 rounded-lg border ${
          fromMemo ? 'border-[#2592FF]/30 bg-[#f3f9ff]' : 'border-[#A1A1A1] bg-white'
        }`}>
          <span className="text-base text-[#161616] flex-1">{value}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[#A0A0A0] hover:text-red-500 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* 검색 인풋 */}
      {!value && (
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tc.disease_ph}
            className={`flex-1 px-4 py-3.5 rounded-lg text-base text-[#161616] outline-none border ${
              filled ? 'border-[#A1A1A1]' : 'border-[#EEEEEE] bg-[#F7F7F7]'
            } placeholder:text-[#A0A0A0]`}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-4 py-2 bg-[#2592FF] text-white text-sm font-semibold rounded-lg disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors shrink-0"
          >
            {searching ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : t.common.search}
          </button>
        </div>
      )}
      {searchErr && <p className="text-xs text-red-500">{searchErr}</p>}

      {/* 검색 결과 팝업 */}
      {showPopup && results.length > 0 && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowPopup(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-white rounded-t-3xl px-5 py-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold text-[#161616]">{tc.disease_result_title}</p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">{tc.disease_result_source}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F5] text-[#808080]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 bg-[#F8F9FF] hover:bg-[#EEF3FF] border border-[#E0E8FF] rounded-2xl px-4 py-4 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#2592FF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-[#161616] leading-snug">{r.name}</p>
                    <p className="text-xs text-[#808080] mt-0.5">{tc.disease_icd} {r.code}</p>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
                    <path d="M1 1l6 6-6 6" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-[#A0A0A0] mt-4">
              {tc.disease_result_footer}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function StepMedication({ medicationInstruction, nextAppointmentDate, nextAppointmentTime, fromMemo,
  onMedicationChange, onNextDateChange, onNextTimeChange }: {
  medicationInstruction: string; nextAppointmentDate: string; nextAppointmentTime: string; fromMemo?: boolean;
  onMedicationChange: (v: string) => void; onNextDateChange: (v: string) => void; onNextTimeChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const tc = t.consultation
  return (
    <div className="flex flex-col gap-5">
      {fromMemo && medicationInstruction && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
          <img src="/icons/interpreter/report/check.svg" alt="" width={16} height={16} />
          <span className="text-sm text-blue-600 font-medium">{tc.ai_auto_filled}</span>
        </div>
      )}
      <FieldTextarea label={tc.medication_field} value={medicationInstruction} onChange={onMedicationChange}
        placeholder={tc.medication_ph} fromMemo={fromMemo} />
      <div className="flex flex-col gap-2.5">
        <label className="text-[16px] font-medium text-[#494949]">{tc.next_schedule}</label>
        <CalendarPicker
          value={nextAppointmentDate}
          onChange={onNextDateChange}
          time={nextAppointmentTime}
          onTimeChange={onNextTimeChange}
        />
      </div>
    </div>
  )
}

