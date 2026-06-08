'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { adminApi, patientApi, centerApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import type { Patient, Consultation, CenterPatientMemo, Center } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { formatKoreanDateTime } from '@/lib/dateFormat'

function consultDateKo(dateStr: string) {
  return formatKoreanDateTime(dateStr)
}

function calcAge(birthDate: string | null | undefined, ageLabel: (age: number) => string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return ageLabel(age)
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <PatientDetailInner />
    </Suspense>
  )
}

function PatientDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightCid = searchParams.get('cid')

  const { t } = useTranslation()
  const labels = useEnumLabels()
  const { data: me } = useMe()
  const tp = t.patient_profile

  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<Consultation[]>([])
  const [memos, setMemos] = useState<CenterPatientMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const [publicMemo, setPublicMemo] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoError, setMemoError] = useState('')

  const [centerPopupOpen, setCenterPopupOpen] = useState(false)
  const [centerSearchQuery, setCenterSearchQuery] = useState('')
  const [allCenters, setAllCenters] = useState<Center[]>([])
  const [centerActionLoading, setCenterActionLoading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setHistoryError('')
      try {
        const pRes = await patientApi.get(id)
        if (cancelled) return
        setPatient(pRes.payload)

        try {
          const hRes = await patientApi.history(id)
          if (!cancelled) setHistory(hRes.payload ?? [])
        } catch (e) {
          if (!cancelled) {
            setHistory([])
            setHistoryError(e instanceof Error ? e.message : t.patient.no_consultation)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, t.patient.no_consultation])

  useEffect(() => {
    if (!me || me.role !== 'interpreter') return
    adminApi.patientMemos(id)
      .then(res => setMemos(res.payload ?? []))
      .catch(() => setMemos([]))
  }, [id, me])

  useEffect(() => {
    if (!centerPopupOpen) return
    centerApi.list(centerSearchQuery || undefined)
      .then(res => setAllCenters(res.payload ?? []))
      .catch(() => setAllCenters([]))
  }, [centerPopupOpen, centerSearchQuery])

  async function handleMemoCreate(e: React.FormEvent) {
    e.preventDefault()
    setMemoSaving(true)
    setMemoError('')
    try {
      await adminApi.createPatientMemo(id, { publicMemo, privateMemo: '', interpreterVisible: true })
      setPublicMemo('')
      const res = await adminApi.patientMemos(id)
      setMemos(res.payload ?? [])
    } catch (e) {
      setMemoError(e instanceof Error ? e.message : t.patient.err_memo)
    } finally {
      setMemoSaving(false)
    }
  }

  async function handleAddCenter(centerId: string) {
    setCenterActionLoading(centerId)
    try {
      const res = await patientApi.addCenter(id, centerId)
      setPatient(res.payload as Patient)
      setCenterPopupOpen(false)
      setCenterSearchQuery('')
    } catch (e) {
      alert(e instanceof Error ? e.message : t.patient.err_center_add)
    } finally {
      setCenterActionLoading(null)
    }
  }

  async function handleRemoveCenter(centerId: string) {
    if (!confirm(t.patient.confirm_center_remove)) return
    setCenterActionLoading(centerId)
    try {
      const res = await patientApi.removeCenter(id, centerId)
      setPatient(res.payload as Patient)
    } catch (e) {
      alert(e instanceof Error ? e.message : t.patient.err_center_remove)
    } finally {
      setCenterActionLoading(null)
    }
  }

  if (loading) return <AppShell><Spinner /></AppShell>
  if (!patient) return <AppShell><p className="text-center py-10 text-gray-400">{t.patient.not_found}</p></AppShell>

  const highlightedConsultation = highlightCid ? history.find(c => c.id === highlightCid) ?? null : null
  const registeredCenterIds = new Set((patient.centers ?? []).map(c => c.id))
  const filteredCenters = allCenters.filter(c =>
    !centerSearchQuery || c.name.toLowerCase().includes(centerSearchQuery.toLowerCase())
  )
  const isInterpreter = me?.role === 'interpreter'
  const flagSrc = getFlagSrc(patient.nationality)
  const ageStr = calcAge(patient.birthDate, t.patient.age_years)

  return (
    <AppShell noPadding>
      <PageHeader title={tp.title} />

      {/* 오늘 진료 배너 */}
      {highlightedConsultation && (
        <div className="bg-[#f6fff3] px-5 py-4 flex flex-col gap-1">
          <p className="text-[18px] font-semibold text-[#30c100]">{tp.today_consultation}</p>
          <p className="text-[16px] text-[#5d5d5d]">{consultDateKo(highlightedConsultation.consultationDate)}</p>
          {(highlightedConsultation.hospitalName || highlightedConsultation.department) && (
            <p className="text-[16px] text-[#5d5d5d]">
              {[highlightedConsultation.hospitalName, highlightedConsultation.department].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className="bg-[#f7f7f7] px-4 py-4 pb-10 flex flex-col gap-4 min-h-screen">

        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-[8px] px-4 py-6 flex flex-col gap-5">
          {/* 프로필 사진 + 이름 */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
              {patient.avatarUrl ? (
                <Image src={patient.avatarUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <Image
                  src={patient.gender === 'FEMALE'
                    ? '/icons/common/gender/big-여성-배경o.svg'
                    : '/icons/common/gender/big-남성-배경o.svg'}
                  alt="" fill className="object-cover"
                />
              )}
            </div>
            <h2 className="text-[26px] font-semibold text-[#161616]">{patient.name}</h2>
          </div>

          {/* 기본 정보 rows */}
          <div className="flex flex-col gap-4">
            {patient.birthDate && (
              <div className="flex items-center gap-[10px]">
                <span className="text-[18px] text-[#494949] w-20 shrink-0">{t.patient.birth_date}</span>
                <span className="text-[18px] font-medium text-[#161616]">
                  {patient.birthDate.replace(/-/g, '.')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-[10px]">
              <span className="text-[18px] text-[#494949] w-20 shrink-0">{t.patient.gender}</span>
              <div className="flex items-center gap-1">
                <span className="text-[18px] font-medium text-[#161616]">{labels.gender[patient.gender]}</span>
                <Image
                  src={patient.gender === 'FEMALE'
                    ? '/icons/common/gender/small-여성-배경x.svg'
                    : '/icons/common/gender/small-남성-배경x.svg'}
                  alt="" width={24} height={24}
                />
              </div>
            </div>
            <div className="flex items-center gap-[10px]">
              <span className="text-[18px] text-[#494949] w-20 shrink-0">{t.patient.nationality}</span>
              <div className="flex items-center gap-1">
                <span className="text-[18px] font-medium text-[#161616]">{labels.nationality[patient.nationality]}</span>
                {flagSrc && <Image src={flagSrc} alt="" width={24} height={24} />}
              </div>
            </div>
          </div>

          {/* 액션 버튼 3개 */}
          <div className="flex gap-2">
            <Link
              href={`/rm/new?patientId=${id}${highlightCid ? `&cid=${highlightCid}` : ''}`}
              className="flex-1 px-3 py-4 bg-[#f0f1f5] rounded-[8px] flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
            >
              <Image src="/icons/interpreter/patient-profile/실시간메모.svg" alt="" width={24} height={24} />
              <span className="text-[16px] font-medium text-[#161616]">{tp.realtime_memo}</span>
            </Link>
            <Link
              href={`/consultations/start?patientId=${id}`}
              className="flex-1 px-3 py-4 bg-[#f0f1f5] rounded-[8px] flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
            >
              <Image src="/icons/interpreter/patient-profile/보고서.svg" alt="" width={24} height={24} />
              <span className="text-[16px] font-medium text-[#161616]">{tp.report}</span>
            </Link>
            <a
              href={patient.phone ? `tel:${patient.phone}` : undefined}
              onClick={!patient.phone ? e => e.preventDefault() : undefined}
              className={`flex-1 px-3 py-4 bg-[#f0f1f5] rounded-[8px] flex flex-col items-center gap-2 active:opacity-70 transition-opacity ${!patient.phone ? 'opacity-40' : ''}`}
            >
              <Image src="/icons/interpreter/patient-profile/전화.svg" alt="" width={24} height={24} />
              <span className="text-[16px] font-medium text-[#161616]">{tp.call}</span>
            </a>
          </div>
        </div>

        {/* 추가 정보 카드 (비자 / 거주지) */}
        {(patient.visaType || patient.region) && (
          <div className="bg-white rounded-[8px] px-4 py-5 flex flex-col gap-4">
            {patient.visaType && (
              <div className="flex items-center gap-[10px]">
                <span className="text-[18px] text-[#494949] w-20 shrink-0">{t.patient.visa}</span>
                <span className="text-[18px] font-medium text-[#161616]">{labels.visa[patient.visaType]}</span>
              </div>
            )}
            {patient.region && (
              <div className="flex items-center gap-[10px]">
                <span className="text-[18px] text-[#494949] w-20 shrink-0">{t.patient.region}</span>
                <span className="text-[18px] font-medium text-[#161616]">{patient.region}</span>
              </div>
            )}
          </div>
        )}

        {/* 센터 메모 (통번역가) */}
        {isInterpreter && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-neutral-700">{t.patient.center_memo}</h3>
            <form onSubmit={handleMemoCreate} className="space-y-2">
              <textarea
                className="w-full input min-h-20 text-sm"
                value={publicMemo}
                onChange={e => setPublicMemo(e.target.value)}
                placeholder={t.patient.public_memo_placeholder}
              />
              {memoError && <p className="text-red-500 text-xs">{memoError}</p>}
              <button type="submit" className="btn-secondary w-full text-sm" disabled={memoSaving}>
                {memoSaving ? t.patient.memo_saving : t.patient.memo_save}
              </button>
            </form>
            {memos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">{t.patient.no_memo}</p>
            ) : (
              <div className="space-y-2">
                {memos.map(memo => (
                  <div key={memo.id} className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                    <span className="text-xs text-gray-400">{formatKoreanDateTime(memo.createdAt)}</span>
                    {memo.publicMemo && <p className="whitespace-pre-wrap">{memo.publicMemo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 이전 진료 내역 */}
        <h3 className="text-[20px] font-semibold text-[#161616] pt-1">{tp.consultation_history}</h3>

        {historyError ? (
          <p className="text-sm text-red-500 text-center py-4">{historyError}</p>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-[8px] px-5 py-8 text-center">
            <p className="text-sm text-gray-400">{t.patient.no_consultation}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map(c => (
              <ConsultationCard key={c.id} c={c} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* 센터 추가 팝업 (비활성화) */}
      {false && centerPopupOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t.patient.center_search_title}</h3>
              <button onClick={() => { setCenterPopupOpen(false); setCenterSearchQuery('') }}
                className="text-gray-400 text-lg leading-none">×</button>
            </div>
            <input className="input" placeholder={t.patient.center_search_placeholder}
              value={centerSearchQuery} onChange={e => setCenterSearchQuery(e.target.value)} autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredCenters.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">{t.common.no_result}</p>
              ) : filteredCenters.map(center => {
                const already = registeredCenterIds.has(center.id)
                return (
                  <button key={center.id} onClick={() => !already && handleAddCenter(center.id)}
                    disabled={already || centerActionLoading === center.id}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      already ? 'bg-gray-50 text-gray-400 cursor-default' : 'hover:bg-blue-50 hover:text-blue-700'
                    }`}>
                    <span className="font-medium">{center.name}</span>
                    {already && <span className="text-xs text-green-600 ml-1">{t.patient.already_registered}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-sm text-zinc-500 shrink-0">{label}</span>
      <span className="text-base font-medium text-neutral-900">{value}</span>
    </div>
  )
}

// ─── 진료 기록 카드 (인라인 상세 표시) ────────────────────────────────────────

function ConsultationCard({
  c, t,
}: {
  c: Consultation
  t: ReturnType<typeof useTranslation>['t']
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-[8px] overflow-hidden">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50 transition-colors"
      >
        <div className="flex flex-col gap-2 text-left min-w-0 flex-1 pr-3">
          <span className="text-[20px] font-semibold text-[#161616]">{consultDateKo(c.consultationDate)}</span>
          <div className="flex flex-col gap-0.5">
            {(c.diagnosisNameCode || c.diagnosisContent) && (
              <span className="text-[20px] font-medium text-[#161616] truncate">
                {c.diagnosisNameCode?.replace(/\s*\([^)]+\)\s*$/, '').trim() || c.diagnosisContent}
              </span>
            )}
            {(c.hospitalName || c.department) && (
              <span className="text-[18px] text-[#494949] truncate">
                {[c.hospitalName, c.department].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.confirmed && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
              {t.common.confirmed}
            </span>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#A0A0A0" strokeWidth={2} strokeLinecap="round"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* 상세 내용 (펼침) */}
      {open && (
        <div className="border-t border-[#F5F5F5] px-5 py-4 space-y-3 bg-[#FAFAFA]">
          {c.diagnosisNameCode && (
            <DetailRow label={t.consultation.diagnosis_name_code} value={c.diagnosisNameCode} />
          )}
          {c.diagnosisContent && (
            <DetailBlock label={t.consultation.diagnosis_content} value={c.diagnosisContent} />
          )}
          {c.patientComment && (
            <DetailBlock label={t.consultation.patient_comment} value={c.patientComment} />
          )}
          {c.treatmentResult && (
            <DetailBlock label={t.consultation.treatment_result} value={c.treatmentResult} />
          )}
          {c.medicationInstruction && (
            <DetailBlock label={t.consultation.medication} value={c.medicationInstruction} />
          )}
          {c.nextAppointmentDate && (
            <DetailRow label={t.consultation.next_appointment} value={formatKoreanDateTime(c.nextAppointmentDate)} accent />
          )}
          {c.workDescription && (
            <DetailBlock label="실시간 메모" value={c.workDescription} muted />
          )}
          {!c.diagnosisContent && !c.patientComment && !c.treatmentResult && !c.medicationInstruction && (
            <p className="text-xs text-[#A0A0A0] text-center py-2">작성된 상세 내용이 없습니다</p>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs font-medium text-[#A0A0A0] shrink-0 w-24 pt-0.5">{label}</span>
      <span className={`text-sm font-medium ${accent ? 'text-[#2592FF]' : 'text-[#161616]'}`}>{value}</span>
    </div>
  )
}

function DetailBlock({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#A0A0A0]">{label}</span>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${muted ? 'text-[#808080]' : 'text-[#161616]'}`}>
        {value}
      </p>
    </div>
  )
}
