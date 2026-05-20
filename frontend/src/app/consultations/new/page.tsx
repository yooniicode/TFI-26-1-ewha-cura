'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { consultationApi, patientApi } from '@/lib/api'
import type { Consultation, Patient } from '@/lib/types'

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}세`
}

const nationalityFlag: Record<string, string> = {
  VIETNAM: '🇻🇳', CHINA: '🇨🇳', PHILIPPINES: '🇵🇭', CAMBODIA: '🇰🇭',
  MYANMAR: '🇲🇲', THAILAND: '🇹🇭', INDONESIA: '🇮🇩', MONGOLIA: '🇲🇳',
  NEPAL: '🇳🇵', UZBEKISTAN: '🇺🇿', OTHER: '🌏',
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

  const [patient, setPatient] = useState<Patient | null>(null)
  const [recentHistory, setRecentHistory] = useState<Consultation[]>([])
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)

  // Step 1
  const [workDescription, setWorkDescription] = useState('')
  // Step 2
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().split('T')[0])
  const [hospitalName, setHospitalName] = useState('')
  const [department, setDepartment] = useState('')
  // Step 3
  const [patientComment, setPatientComment] = useState('')
  const [diagnosisContent, setDiagnosisContent] = useState('')
  const [treatmentResult, setTreatmentResult] = useState('')
  // Step 4
  const [medicationInstruction, setMedicationInstruction] = useState('')
  const [nextAppointmentDate, setNextAppointmentDate] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientId) return
    patientApi.get(patientId).then(r => setPatient(r.payload ?? null)).catch(() => {})
    patientApi.history(patientId).then(r => setRecentHistory(r.payload ?? [])).catch(() => {})
  }, [patientId])

  function handleLoadRecentRm() {
    const recent = recentHistory.find(c => c.workDescription?.trim())
    if (recent?.workDescription) setWorkDescription(recent.workDescription)
  }

  async function handleSave() {
    if (!patientId) return
    setSubmitting(true)
    setError('')
    try {
      await consultationApi.create({
        patientId,
        consultationDate,
        issueType: 'MEDICAL',
        processing: 'INTERPRETATION',
        workDescription: workDescription || undefined,
        patientComment: patientComment || undefined,
        diagnosisContent: diagnosisContent || undefined,
        treatmentResult: treatmentResult || undefined,
        medicationInstruction: medicationInstruction || undefined,
        nextAppointmentDate: nextAppointmentDate || undefined,
        department: department || undefined,
      })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      setSubmitting(false)
    }
  }

  const ageStr = calcAge(patient?.birthDate)
  const flag = patient?.nationality ? (nationalityFlag[patient.nationality] ?? '🌏') : ''
  const patientName = patient?.name ?? ''

  // 완료 화면
  if (done) {
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
          <div className="w-6" />
          <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">보고서 작성</h1>
          <div className="w-6" />
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <p className="text-[26px] font-semibold text-[#161616] leading-[1.4] text-center">
            보고서를 작성했어요
          </p>
        </div>
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
          <button
            onClick={() => router.back()}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-lg font-semibold text-white"
          >
            확인
          </button>
        </div>
      </AppShell>
    )
  }

  const title = step === 1 ? '진료 내용을\n기록합니다' : '비어있는 부분을\n빠짐없이 작성합니다'
  const TOTAL_STEPS = 4

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
        <button onClick={() => router.back()} className="text-gray-400 text-xl leading-none w-6">←</button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">보고서 작성</h1>
        <div className="w-6" />
      </div>

      {/* 타이틀 */}
      <div className="bg-white px-6 pt-8 pb-0">
        <h2 className="text-[26px] font-semibold text-[#161616] leading-[1.4] whitespace-pre-line">
          {title}
        </h2>
      </div>

      {/* 환자 정보 바 */}
      <div className="bg-white px-6 py-2.5 border-b border-[#EEEEEE] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#DEE2FF] flex items-center justify-center text-sm font-semibold text-indigo-700">
              {patientName.charAt(0)}
            </div>
            {flag && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">{flag}</span>
            )}
          </div>
          <span className="text-lg font-medium text-[#161616]">{patientName}</span>
          {ageStr && <span className="text-lg text-[#494949]">{ageStr}</span>}
        </div>
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="w-1.5 h-3 rounded-sm border-2 border-[#C7C7C7]" />
        </div>
      </div>

      {/* 스텝별 컨텐츠 */}
      <div className="bg-white px-6 pt-5 pb-36">
        {step === 1 && (
          <Step1
            workDescription={workDescription}
            onChange={setWorkDescription}
            canLoadRm={recentHistory.some(c => c.workDescription?.trim())}
            onLoadRm={handleLoadRecentRm}
          />
        )}
        {step === 2 && (
          <Step2
            consultationDate={consultationDate}
            hospitalName={hospitalName}
            department={department}
            onDateChange={setConsultationDate}
            onHospitalChange={setHospitalName}
            onDepartmentChange={setDepartment}
          />
        )}
        {step === 3 && (
          <Step3
            patientComment={patientComment}
            diagnosisContent={diagnosisContent}
            treatmentResult={treatmentResult}
            onPatientCommentChange={setPatientComment}
            onDiagnosisChange={setDiagnosisContent}
            onTreatmentChange={setTreatmentResult}
          />
        )}
        {step === 4 && (
          <Step4
            medicationInstruction={medicationInstruction}
            nextAppointmentDate={nextAppointmentDate}
            onMedicationChange={setMedicationInstruction}
            onNextDateChange={setNextAppointmentDate}
          />
        )}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* 하단 네비게이션 바 */}
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
          {step < TOTAL_STEPS ? '다음으로' : submitting ? '저장 중...' : '다음으로'}
        </button>
      </div>
    </AppShell>
  )
}

// ─── 공통 필드 컴포넌트 ────────────────────────────────────────────────────────

function FieldInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
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
          filled ? 'border-[#A1A1A1]' : 'border-[#EEEEEE]'
        } placeholder:text-[#808080]`}
      />
    </div>
  )
}

function FieldTextarea({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
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
          filled ? 'border-[#A1A1A1]' : 'border-[#EEEEEE]'
        } placeholder:text-[#808080]`}
      />
    </div>
  )
}

// ─── 스텝 컴포넌트 ────────────────────────────────────────────────────────────

function Step1({
  workDescription, onChange, canLoadRm, onLoadRm,
}: {
  workDescription: string
  onChange: (v: string) => void
  canLoadRm: boolean
  onLoadRm: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onLoadRm}
        disabled={!canLoadRm}
        className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-[#F0F1F5] rounded-lg disabled:opacity-40"
      >
        <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="#494949" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="1" width="14" height="16" rx="2" />
          <line x1="4" y1="6" x2="12" y2="6" />
          <line x1="4" y1="9" x2="12" y2="9" />
          <line x1="4" y1="12" x2="9" y2="12" />
        </svg>
        <span className="text-sm font-medium text-[#494949]">최근 RM 불러오기</span>
      </button>

      <div className="bg-white rounded-lg border border-[#EEEEEE] px-4 py-6 min-h-[320px] flex flex-col gap-3">
        {workDescription.length === 0 && (
          <span className="text-lg font-medium text-[#808080]">예시</span>
        )}
        <textarea
          value={workDescription}
          onChange={e => onChange(e.target.value)}
          placeholder="얼굴에 1도 화상으로 내원함. 처방받은 연고를 하루 3회 도포하도록 안내함. 피부 자극을 줄이기 위해 뜨거운 물 세안은 피하도록 설명함."
          className="flex-1 w-full min-h-[260px] text-lg text-[#161616] leading-relaxed resize-none outline-none placeholder:text-[#808080]"
          autoFocus
        />
      </div>
    </div>
  )
}

function Step2({
  consultationDate, hospitalName, department,
  onDateChange, onHospitalChange, onDepartmentChange,
}: {
  consultationDate: string
  hospitalName: string
  department: string
  onDateChange: (v: string) => void
  onHospitalChange: (v: string) => void
  onDepartmentChange: (v: string) => void
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
      <FieldInput label="방문 병원" value={hospitalName} onChange={onHospitalChange} placeholder="병원명을 입력하세요" />
      <FieldInput label="방문 과" value={department} onChange={onDepartmentChange} placeholder="진료과를 입력하세요" />
    </div>
  )
}

function Step3({
  patientComment, diagnosisContent, treatmentResult,
  onPatientCommentChange, onDiagnosisChange, onTreatmentChange,
}: {
  patientComment: string
  diagnosisContent: string
  treatmentResult: string
  onPatientCommentChange: (v: string) => void
  onDiagnosisChange: (v: string) => void
  onTreatmentChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <FieldTextarea label="증상 및 내원 계기" value={patientComment} onChange={onPatientCommentChange} placeholder="증상을 입력하세요" />
      <FieldTextarea label="의사 진단" value={diagnosisContent} onChange={onDiagnosisChange} placeholder="진단 내용을 입력하세요" />
      <FieldTextarea label="주의 사항" value={treatmentResult} onChange={onTreatmentChange} placeholder="주의 사항을 입력하세요" />
    </div>
  )
}

function Step4({
  medicationInstruction, nextAppointmentDate,
  onMedicationChange, onNextDateChange,
}: {
  medicationInstruction: string
  nextAppointmentDate: string
  onMedicationChange: (v: string) => void
  onNextDateChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <FieldTextarea label="약 복용" value={medicationInstruction} onChange={onMedicationChange} placeholder="약 복용 방법을 입력하세요" />
      <div className="flex flex-col gap-2">
        <label className="text-base font-medium text-[#161616]">다음 일정</label>
        <input
          type="date"
          value={nextAppointmentDate}
          onChange={e => onNextDateChange(e.target.value)}
          placeholder="다음 진료 일정을 선택해주세요"
          className={`w-full px-4 py-4 rounded-lg text-lg text-[#161616] border outline-none ${
            nextAppointmentDate ? 'border-[#A1A1A1]' : 'border-[#EEEEEE]'
          } placeholder:text-[#808080]`}
        />
      </div>
    </div>
  )
}
