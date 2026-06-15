'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import Spinner from '@/components/ui/Spinner'
import { consultationApi, patientApi } from '@/lib/api'
import { ISSUE_LABEL, NATIONALITY_LABEL, VISA_LABEL, type Consultation, type Patient } from '@/lib/types'
import { ConsultationCard } from '@/components/consultation'

/* ── 유틸 ─────────────────────────────────────────── */
function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return `${age}세`
}

function formatBirth(dateStr?: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function consultDateTimeKo(dateStr: string, time?: string | null): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const base = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
  return time ? `${base} ${time}` : base
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

const NATIONALITY_FLAG: Partial<Record<string, string>> = {
  VIETNAM: '/icons/베트남국기.svg',
}

/* ── 엔트리 ───────────────────────────────────────── */
export default function PatientProfilePage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <PatientProfileInner />
    </Suspense>
  )
}

/* ── 메인 컴포넌트 ────────────────────────────────── */
function PatientProfileInner() {
  const { id: patientId } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  // rm/new에서 넘어올 때 현재 consultationId 를 전달
  const currentConsultationId = searchParams.get('consultationId') ?? ''

  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<Consultation[]>([])
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [pRes, hRes] = await Promise.all([
          patientApi.get(patientId),
          patientApi.history(patientId),
        ])
        if (cancelled) return
        setPatient(pRes.payload ?? null)
        setHistory(hRes.payload ?? [])

        // 오늘 진료 카드에 보여줄 consultation
        if (currentConsultationId) {
          const cRes = await consultationApi.get(currentConsultationId)
          if (!cancelled) setCurrentConsultation(cRes.payload ?? null)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [patientId, currentConsultationId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6]">
        <Spinner />
      </div>
    )
  }

  const age = calcAge(patient?.birthDate)
  const nationality = patient?.nationality
  const flagIcon = nationality ? NATIONALITY_FLAG[nationality] : undefined
  const genderLabel = patient?.gender === 'MALE' ? '남성' : patient?.gender === 'FEMALE' ? '여성' : '-'
  const genderIcon = patient?.gender === 'MALE'
    ? '/icons/성별-남자.svg'
    : patient?.gender === 'FEMALE'
      ? '/icons/성별-여자.svg'
      : null

  // 오늘 진료: currentConsultation 우선, 없으면 history에서 오늘 날짜 찾기
  const todayConsult = currentConsultation
    ?? history.find(c => isToday(c.consultationDate))
    ?? null

  const todayTime = (() => {
    const raw = todayConsult?.confirmedAt ?? todayConsult?.createdAt
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null
      : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  })()

  // 이전 진료 내역 (오늘 제외, 최근순)
  const pastConsults = history
    .filter(c => !isToday(c.consultationDate))
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-[#f6f6f6]" style={{ maxWidth: 402, margin: '0 auto' }}>

      {/* ── 헤더 ── Figma: 402×60 */}
      <div className="sticky top-0 z-10 flex h-[60px] items-center bg-white px-4 border-b border-[#f6f6f6]">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center"
          aria-label="뒤로"
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" aria-hidden="true">
            <path d="M9 1L1 8.5L9 16" stroke="#414141" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[16px] font-semibold text-[#414141]">
          상세 프로필
        </h1>
        <div className="w-10" aria-hidden="true" />
      </div>

      {/* ── 오늘 진료 배너 ── Figma: 402×111, bg #f6fff3 */}
      {todayConsult && (
        <div className="bg-[#f6fff3] px-[16px] py-[20px]">
          <p className="text-[18px] font-medium text-[#30c100]">오늘 진료가 있어요</p>
          <div className="mt-[9px] flex flex-col gap-[4px]">
            <span className="text-[16px] text-[#5c5c5c]">
              {consultDateTimeKo(todayConsult.consultationDate, todayTime)}
            </span>
            {(todayConsult.hospitalName || todayConsult.department) && (
              <span className="text-[16px] text-[#5c5c5c]">
                {[todayConsult.hospitalName, todayConsult.department].filter(Boolean).join(' ')}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pt-[16px] pb-8 space-y-[16px]">

        {/* ── 환자 기본 정보 카드 ── Figma: 370×315, white, r=8 */}
        <div className="rounded-[8px] bg-white px-6 pt-6 pb-5">
          {/* 이름 */}
          <p className="text-[26px] font-semibold text-[#161616] mb-[22px]">
            {patient?.name ?? '-'}
          </p>

          {/* 정보 행들 ── Figma: 18px */}
          <div className="flex flex-col gap-[18px] mb-[22px]">
            {/* 생년월일 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">생년월일</span>
              <span className="text-[18px] font-medium text-[#161616]">
                {patient?.birthDate ? `${formatBirth(patient.birthDate)} (${age})` : '-'}
              </span>
            </div>

            {/* 성별 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">성별</span>
              <div className="flex items-center gap-[6px]">
                <span className="text-[18px] font-medium text-[#161616]">{genderLabel}</span>
                {genderIcon && (
                  <Image src={genderIcon} alt={genderLabel} width={20} height={20} />
                )}
              </div>
            </div>

            {/* 국적 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">국적</span>
              <div className="flex items-center gap-[6px]">
                <span className="text-[18px] font-medium text-[#161616]">
                  {nationality ? NATIONALITY_LABEL[nationality] : '-'}
                </span>
                {flagIcon && (
                  <div className="h-[24px] w-[24px] overflow-hidden rounded-full">
                    <Image src={flagIcon} alt={nationality ?? ''} width={24} height={24} className="object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 퀵 액션 3버튼 ── Figma: 107×87 each, bg #f0f1f5, r=8 */}
          <div className="grid grid-cols-3 gap-[8px]">
            {/* 실시간 메모 */}
            <Link
              href={currentConsultationId
                ? `/rm/new?consultationId=${currentConsultationId}`
                : `/rm/new?patientId=${patientId}`
              }
              className="flex h-[87px] flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f0f1f5] transition-opacity active:opacity-70"
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M8 14h12M14 8v12" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" />
                <rect x="4" y="4" width="20" height="20" rx="4" stroke="#161616" strokeWidth="1.6" />
              </svg>
              <span className="text-[16px] font-medium text-[#161616]">실시간 메모</span>
            </Link>

            {/* 보고서 */}
            <Link
              href={`/consultations?patientId=${patientId}`}
              className="flex h-[87px] flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f0f1f5] transition-opacity active:opacity-70"
            >
              <Image src="/icons/메인_보고서.svg" alt="" width={24} height={24} />
              <span className="text-[14px] font-medium text-[#484848]">보고서</span>
            </Link>

            {/* 전화 */}
            {patient?.phone ? (
              <a
                href={`tel:${patient.phone}`}
                className="flex h-[87px] flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f0f1f5] transition-opacity active:opacity-70"
              >
                <Image src="/icons/전화.svg" alt="" width={28} height={28} />
                <span className="text-[16px] font-medium text-[#161616]">전화</span>
              </a>
            ) : (
              <div className="flex h-[87px] flex-col items-center justify-center gap-[6px] rounded-[8px] bg-[#f0f1f5] opacity-40">
                <Image src="/icons/전화.svg" alt="" width={28} height={28} />
                <span className="text-[16px] font-medium text-[#161616]">전화</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 추가 정보 카드 ── Figma: 370×127, white, r=8 */}
        <div className="rounded-[8px] bg-white px-6 py-[16px]">
          <div className="flex flex-col gap-[18px]">
            {/* 비자 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">비자</span>
              <span className="text-[18px] font-medium text-[#161616]">
                {patient?.visaType ? VISA_LABEL[patient.visaType] : '-'}
              </span>
            </div>
            {/* 거주지 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">거주지</span>
              <span className="text-[18px] font-medium text-[#161616]">
                {patient?.region || '-'}
              </span>
            </div>
            {/* 전화번호 */}
            <div className="flex items-center gap-[12px]">
              <span className="w-[80px] text-[18px] text-[#484848]">전화번호</span>
              <span className="text-[18px] font-medium text-[#161616]">
                {patient?.phone || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* ── 이전 진료 내역 ── Figma: 18px SemiBold #161616 + 카드 목록 */}
        {pastConsults.length > 0 && (
          <div>
            <p className="mb-[12px] text-[18px] font-medium text-[#161616]">이전 진료 내역</p>
            <div className="flex flex-col gap-[10px]">
              {pastConsults.map(c => {
                const cTime = (() => {
                  const raw = c.confirmedAt ?? c.createdAt
                  if (!raw) return null
                  const d = new Date(raw)
                  return isNaN(d.getTime()) ? null
                    : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                })()
                const title = c.diagnosisContent?.trim() || ISSUE_LABEL[c.issueType] || c.issueType
                const place = [c.hospitalName, c.department].filter(Boolean).join(' ')
                return (
                  <ConsultationCard
                    key={c.id}
                    variant="chevron"
                    patientName={consultDateTimeKo(c.consultationDate, cTime)}
                    dateLabel={title}
                    locationLabel={place}
                    href={`/consultations/${c.id}`}
                  />
                )
              })}
            </div>
          </div>
        )}

        {pastConsults.length === 0 && !loading && (
          <div className="rounded-[8px] bg-white px-5 py-8 text-center text-[15px] text-[#7f7f7f]">
            이전 진료 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
