'use client'

import { Suspense, useEffect, useState } from 'react'
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

  const labels = useEnumLabels()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [recentHistory, setRecentHistory] = useState<Consultation[]>([])
  const [rmConsultation, setRmConsultation] = useState<Consultation | null>(null)
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)

  // Step 1 (처음부터 작성하기 전용)
  const [workDescription, setWorkDescription] = useState('')
  // Step 2
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().split('T')[0])
  const [hospitalName, setHospitalName] = useState('')
  const [department, setDepartment] = useState('')
  // Step 3
  const [patientComment, setPatientComment] = useState('')
  const [diagnosisNameCode, setDiagnosisNameCode] = useState('')
  const [diagnosisContent, setDiagnosisContent] = useState('')
  const [treatmentResult, setTreatmentResult] = useState('')
  // Step 4
  const [medicationInstruction, setMedicationInstruction] = useState('')
  const [nextAppointmentDate, setNextAppointmentDate] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [aiParsing, setAiParsing] = useState(false)

  // 메모에서 온 경우 step 1 건너뜀
  const fromMemo = !!rmCid
  const TOTAL_STEPS = fromMemo ? 3 : 4
  // step 숫자 매핑: fromMemo → 4~6, 처음부터 → 3~6
  const stepLabel = fromMemo ? step + 3 : step + 2

  function applyParsedFields(fields: Record<string, string>) {
    if (fields.diagnosisNameCode) setDiagnosisNameCode(fields.diagnosisNameCode)
    if (fields.diagnosisContent) setDiagnosisContent(fields.diagnosisContent)
    if (fields.treatmentResult) setTreatmentResult(fields.treatmentResult)
    if (fields.medicationInstruction) setMedicationInstruction(fields.medicationInstruction)
    if (fields.nextAppointmentDate) setNextAppointmentDate(fields.nextAppointmentDate)
    if (fields.department) setDepartment(fields.department)
    if (fields.hospitalName) setHospitalName(fields.hospitalName)
    if (fields.patientComment) setPatientComment(fields.patientComment)
  }

  async function parseWithClaude(rmText: string) {
    setAiParsing(true)
    try {
      const res = await fetch('/api/parse-rm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmText }),
      })
      if (res.ok) {
        const data = await res.json() as { fields: Record<string, string> | null }
        if (data.fields) applyParsedFields(data.fields)
      }
    } catch { /* AI 실패 시 빈 칸으로 */ }
    setAiParsing(false)
  }

  useEffect(() => {
    if (!patientId) return
    patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    patientApi.history(patientId).then(r => setRecentHistory(r.payload ?? [])).catch(() => {})
  }, [patientId])

  useEffect(() => {
    if (!rmCid) return
    consultationApi.get(rmCid).then(r => {
      const c = r.payload ?? null
      setRmConsultation(c)
      if (c?.workDescription) setWorkDescription(c.workDescription)
      if (c?.hospitalName) setHospitalName(c.hospitalName)
      if (c?.department) setDepartment(c.department)
      if (c?.consultationDate) setConsultationDate(c.consultationDate)
    }).catch(() => {})
  }, [rmCid])

  // sessionStorage에서 AI 파싱 결과 적용 (메모→편집→여기로 올 때)
  useEffect(() => {
    const raw = sessionStorage.getItem('rm_parsed_fields')
    if (!raw) return
    sessionStorage.removeItem('rm_parsed_fields')
    try {
      applyParsedFields(JSON.parse(raw) as Record<string, string>)
    } catch { /* ignore */ }
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
          consultationDate,
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
          nextAppointmentDate: nextAppointmentDate || null,
          counselorName: rmConsultation.counselorName || '',
          durationHours: rmConsultation.durationHours ?? null,
          fee: rmConsultation.fee ?? null,
          workDescription: workDescription || '',
          doctorConfirmationSignature: rmConsultation.doctorConfirmationSignature || '',
          memo: rmConsultation.memo || '',
        })
      } else {
        await consultationApi.create({
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
          nextAppointmentDate: nextAppointmentDate || undefined,
          department: department || undefined,
          hospitalName: hospitalName || undefined,
        })
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
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
        <PageHeader title="보고서 작성" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f3f9ff] flex items-center justify-center mb-6">
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
              <path d="M2 12L12 22L30 2" stroke="#2592FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[26px] font-semibold text-[#161616] leading-[1.4]">
            보고서를 작성했어요
          </p>
          <p className="mt-2 text-base text-[#808080]">수고하셨습니다</p>
        </div>
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
          <button
            onClick={() => router.replace('/dashboard')}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white"
          >
            홈으로 돌아가기
          </button>
        </div>
      </AppShell>
    )
  }

  // 스텝 제목
  const stepTitles: Record<number, string> = fromMemo
    ? { 1: '진료 정보를\n입력합니다', 2: '진료 내용을\n기록합니다', 3: '투약 및\n다음 일정입니다' }
    : { 1: '진료 내용을\n기록합니다', 2: '진료 정보를\n입력합니다', 3: '진료 내용을\n기록합니다', 4: '투약 및\n다음 일정입니다' }

  const title = stepTitles[step] ?? ''

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

      {/* 타이틀 */}
      <div className="bg-white px-6 pt-8 pb-0">
        <h2 className="text-[26px] font-semibold text-[#161616] leading-[1.4] whitespace-pre-line">
          {title}
        </h2>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="bg-white px-6 pt-4 pb-5">
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => i + 1).map(n => {
            const done = n < stepLabel
            const active = n === stepLabel
            return (
              <div
                key={n}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  active ? 'bg-[#2592FF] text-white' : done ? 'bg-[#f3f9ff]' : 'bg-[#F7F7F7] text-[#808080]'
                }`}
              >
                {done ? (
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
      <div className="bg-white px-6 pt-2 pb-36">
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
        {(fromMemo ? step === 2 : step === 3) && (
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
        )}
        {(fromMemo ? step === 3 : step === 4) && (
          <StepMedication
            medicationInstruction={medicationInstruction}
            nextAppointmentDate={nextAppointmentDate}
            fromMemo={fromMemo}
            onMedicationChange={setMedicationInstruction}
            onNextDateChange={setNextAppointmentDate}
          />
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8 flex gap-2.5">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-[111px] h-[60px] bg-[#F0F1F5] rounded-lg text-lg font-medium text-[#494949]"
          >
            이전
          </button>
        )}
        <button
          onClick={step < TOTAL_STEPS ? () => setStep(s => s + 1) : handleSave}
          disabled={submitting}
          className="flex-1 h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white disabled:opacity-60"
        >
          {step < TOTAL_STEPS ? '다음으로' : submitting ? '저장 중...' : '저장하기'}
        </button>
      </div>
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
  return (
    <div className="flex flex-col gap-4">
      <div className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-50 rounded-lg border border-blue-100 min-h-[52px]">
        {aiParsing ? (
          <>
            <svg className="animate-spin w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm text-blue-600">AI가 실시간 메모를 분석하는 중...</span>
          </>
        ) : workDescription ? (
          <span className="text-sm text-blue-600 font-medium">최근 실시간 메모를 불러왔어요. 수정 후 다음으로 넘어가세요.</span>
        ) : (
          <span className="text-sm text-gray-400">전달받은 내용을 줄글로 작성해주세요.</span>
        )}
      </div>

      <div className={`rounded-xl border px-4 py-5 min-h-[280px] flex flex-col gap-2 ${
        workDescription ? 'border-[#D1E8FF] bg-[#F3F9FF]' : 'border-[#EEEEEE] bg-[#F7F7F7]'
      }`}>
        {!workDescription && (
          <span className="text-sm font-medium text-[#A0A0A0]">작성 예시</span>
        )}
        <textarea
          value={workDescription}
          onChange={e => onChange(e.target.value)}
          placeholder="예) 얼굴에 1도 화상으로 내원함. 처방받은 연고를 하루 3회 도포하도록 안내함. 피부 자극을 줄이기 위해 뜨거운 물 세안은 피하도록 설명함."
          className="flex-1 w-full min-h-[220px] bg-transparent text-lg text-[#161616] leading-relaxed resize-none outline-none placeholder:text-[#A0A0A0]"
          autoFocus
        />
      </div>
    </div>
  )
}

function StepDate({ consultationDate, hospitalName, department, onDateChange, onHospitalChange, onDepartmentChange }: {
  consultationDate: string; hospitalName: string; department: string;
  onDateChange: (v: string) => void; onHospitalChange: (v: string) => void; onDepartmentChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-[#161616]">진료 날짜</label>
        <input
          type="date"
          value={consultationDate}
          onChange={e => onDateChange(e.target.value)}
          className="w-full px-4 py-4 rounded-lg text-lg text-[#161616] border border-[#A1A1A1] outline-none"
        />
      </div>

      {/* 병원 검색 (HIRA 병원정보서비스) */}
      <HospitalSearchField value={hospitalName} onChange={onHospitalChange} />

      <FieldInput label="방문 과" value={department} onChange={onDepartmentChange} placeholder="진료과를 입력해주세요" />
    </div>
  )
}

// ─── 병원 검색 필드 (HIRA 병원정보서비스) ────────────────────────────────────

interface HospResult { name: string; address: string; phone: string; type: string }

function HospitalSearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
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
        setSearchErr('검색 결과가 없습니다.')
      } else {
        setResults(data.results)
        setShowPopup(true)
      }
    } catch {
      setSearchErr('검색에 실패했습니다.')
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(r: HospResult) {
    onChange(r.name)
    setShowPopup(false)
    setQuery('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-base font-medium text-[#161616]">
        방문 병원
        <span className="ml-1 text-xs text-[#A0A0A0] font-normal">HIRA 검색</span>
      </label>

      {/* 선택된 병원 */}
      {value && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg border border-[#A1A1A1] bg-white">
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
            placeholder="병원명을 검색해주세요"
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
            ) : '검색'}
          </button>
        </div>
      )}

      {/* 직접 입력 링크 */}
      {!value && (
        <button
          type="button"
          onClick={() => { onChange(query.trim() || '직접 입력'); setQuery('') }}
          className="text-xs text-[#A0A0A0] hover:text-[#2592FF] text-left transition-colors"
        >
          검색 없이 직접 입력하기 →
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
                <p className="text-base font-bold text-[#161616]">병원 검색 결과</p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">건강보험심사평가원 병원정보</p>
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
              출처: 건강보험심사평가원 병원정보서비스
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
  return (
    <div className="flex flex-col gap-5">
      {fromMemo && (diagnosisContent || patientComment || treatmentResult) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
          <img src="/icons/interpreter/report/check.svg" alt="" width={16} height={16} />
          <span className="text-sm text-blue-600 font-medium">AI가 자동으로 채워드렸어요</span>
        </div>
      )}
      <FieldTextarea label="증상 및 내원 계기" value={patientComment} onChange={onPatientCommentChange}
        placeholder="증상을 입력해주세요" fromMemo={fromMemo} />

      {/* 병명 검색 (HIRA API) */}
      <DiseaseSearchField
        value={diagnosisNameCode}
        onChange={onDiagnosisNameCodeChange}
        fromMemo={fromMemo}
      />

      <FieldTextarea label="의사 진단 상세" value={diagnosisContent} onChange={onDiagnosisChange}
        placeholder="진단 내용을 입력해주세요" fromMemo={fromMemo} />
      <FieldTextarea label="주의 사항" value={treatmentResult} onChange={onTreatmentChange}
        placeholder="주의 사항을 입력해주세요" fromMemo={fromMemo} />
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
        setSearchErr('검색 결과가 없습니다.')
      } else {
        setResults(data.results)
        setShowPopup(true)
      }
    } catch {
      setSearchErr('검색에 실패했습니다.')
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
        병명·질병코드
        <span className="ml-1 text-xs text-[#A0A0A0] font-normal">HIRA 검색</span>
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
            placeholder="예) 감기, 고혈압, 당뇨"
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
            ) : '검색'}
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
                <p className="text-base font-bold text-[#161616]">병명 검색 결과</p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">건강보험심사평가원 질병정보</p>
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
                    <p className="text-xs text-[#808080] mt-0.5">ICD 코드: {r.code}</p>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
                    <path d="M1 1l6 6-6 6" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-[#A0A0A0] mt-4">
              출처: 건강보험심사평가원 질병정보서비스
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function StepMedication({ medicationInstruction, nextAppointmentDate, fromMemo,
  onMedicationChange, onNextDateChange }: {
  medicationInstruction: string; nextAppointmentDate: string; fromMemo?: boolean;
  onMedicationChange: (v: string) => void; onNextDateChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {fromMemo && medicationInstruction && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100">
          <img src="/icons/interpreter/report/check.svg" alt="" width={16} height={16} />
          <span className="text-sm text-blue-600 font-medium">AI가 자동으로 채워드렸어요</span>
        </div>
      )}
      <FieldTextarea label="약 복용" value={medicationInstruction} onChange={onMedicationChange}
        placeholder="약 복용 방법을 입력해주세요" fromMemo={fromMemo} />
      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-[#161616]">다음 일정</label>
        <input
          type="date"
          value={nextAppointmentDate}
          onChange={e => onNextDateChange(e.target.value)}
          className={`w-full px-4 py-4 rounded-lg text-lg text-[#161616] border outline-none ${
            nextAppointmentDate ? 'border-[#A1A1A1]' : 'border-[#EEEEEE] bg-[#F7F7F7]'
          } placeholder:text-[#A0A0A0]`}
        />
      </div>
    </div>
  )
}
