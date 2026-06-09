'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { patientApi, consultationApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { queryKeys } from '@/lib/queryKeys'
import type { Consultation, Patient } from '@/lib/types'
import { formatKoreanDate, toDateKey } from '@/lib/dateFormat'

const FLAG: Record<string, string> = {
  VIETNAM: '🇻🇳', CHINA: '🇨🇳', CAMBODIA: '🇰🇭', MYANMAR: '🇲🇲',
  PHILIPPINES: '🇵🇭', INDONESIA: '🇮🇩', THAILAND: '🇹🇭', NEPAL: '🇳🇵',
  MONGOLIA: '🇲🇳', UZBEKISTAN: '🇺🇿', SRI_LANKA: '🇱🇰', BANGLADESH: '🇧🇩',
  PAKISTAN: '🇵🇰', OTHER: '🌍',
}

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  if (
    today.getMonth() < b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())
  ) age--
  return age
}

function getDateLabel(dateStr: string, todayLabel: string, yesterdayLabel: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yd = new Date()
  yd.setDate(yd.getDate() - 1)
  const yesterday = yd.toISOString().split('T')[0]
  const dateKey = toDateKey(dateStr)
  if (dateKey === today) return todayLabel
  if (dateKey === yesterday) return yesterdayLabel
  return formatKoreanDate(dateStr)
}

function GenderAvatar({ gender }: { gender?: string | null }) {
  const isFemale = gender === 'FEMALE'
  return (
    <div
      className="w-[49px] h-[49px] rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: isFemale ? '#fff2f7' : '#dee2ff' }}
    >
      {isFemale ? (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M11.8799 3C15.1272 3.00006 17.7596 5.6326 17.7598 8.87988C17.7598 11.7945 15.6389 14.2125 12.8564 14.6777C12.8587 14.7048 12.8613 14.7321 12.8613 14.7598V15.7402H14.8213C15.3622 15.7405 15.8006 16.1788 15.8008 16.7197C15.8008 17.2608 15.3623 17.7 14.8213 17.7002H12.8613V20.6396C12.8613 21.1809 12.4221 21.6201 11.8809 21.6201C11.3396 21.6201 10.9004 21.1809 10.9004 20.6396V17.7002H8.94043C8.39939 17.7 7.96094 17.2608 7.96094 16.7197C7.96112 16.1788 8.3995 15.7405 8.94043 15.7402H10.9004V14.7598C10.9004 14.7321 10.902 14.7048 10.9043 14.6777C8.12125 14.213 6 11.7949 6 8.87988C6.00013 5.63256 8.63253 3 11.8799 3ZM11.8799 4.95996C9.715 4.95996 7.96009 6.71503 7.95996 8.87988C7.95996 11.0448 9.71493 12.7998 11.8799 12.7998C14.0448 12.7997 15.7998 11.0448 15.7998 8.87988C15.7997 6.71507 14.0447 4.96002 11.8799 4.95996Z" fill="#FF649F" />
        </svg>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M25.332 5.33331C26.0683 5.33331 26.6649 5.93009 26.665 6.66632V10.6663C26.665 11.4027 26.0684 12.0003 25.332 12.0003C24.5957 12.0003 23.999 11.4027 23.999 10.6663V9.97882L20.1592 13.8187C20.0679 13.9099 19.9661 13.984 19.8584 14.0433C20.7851 15.349 21.332 16.9433 21.332 18.6663C21.332 23.0846 17.7503 26.6663 13.332 26.6663C8.91375 26.6663 5.33203 23.0846 5.33203 18.6663C5.33221 14.2482 8.91386 10.6663 13.332 10.6663C15.101 10.6663 16.735 11.242 18.0596 12.2142C18.1171 12.1137 18.1886 12.0187 18.2744 11.9329L22.2061 8.00031H21.332C20.5957 8.00031 19.999 7.4027 19.999 6.66632C19.9992 5.93009 20.5958 5.33331 21.332 5.33331H25.332ZM13.332 13.3333C10.3866 13.3333 7.9992 15.721 7.99902 18.6663C7.99902 21.6118 10.3865 23.9993 13.332 23.9993C16.2775 23.9993 18.665 21.6118 18.665 18.6663C18.6649 15.721 16.2774 13.3333 13.332 13.3333Z" fill="#2036FF" />
        </svg>
      )}
    </div>
  )
}

function FlagBadge({ nationality }: { nationality?: string | null }) {
  return (
    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-sm leading-none shadow-sm border border-[#f0f0f0]">
      {FLAG[nationality ?? ''] ?? '🌍'}
    </div>
  )
}

interface RecentPatient {
  id: string
  name: string
  gender?: string | null
  nationality?: string | null
  birthDate?: string | null
  consultationDate: string
}

export default function PatientSelectPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <PatientSelectInner />
    </Suspense>
  )
}

function PatientSelectInner() {
  const router = useRouter()
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: consultationsData = [], isLoading: loadingRecent } = useQuery<Consultation[]>({
    queryKey: queryKeys.consultations.list(0),
    queryFn: () => consultationApi.list(0).then(r => r.payload ?? []),
  })

  const { data: patientsRaw = [], isLoading: loadingAll } = useQuery<Patient[]>({
    queryKey: queryKeys.patients.list(0),
    queryFn: () => patientApi.list(0).then(r => r.payload ?? []),
  })
  // 보고서 작성은 내 담당 환자만
  const patientsData = patientsRaw.filter(p => p.assignedToMe)

  const recentPatients = useMemo<RecentPatient[]>(() => {
    const seen = new Set<string>()
    return consultationsData
      .filter(c => {
        if (seen.has(c.patientId)) return false
        seen.add(c.patientId)
        return true
      })
      .slice(0, 2)
      .map(c => ({
        id: c.patientId,
        name: c.patientName,
        gender: c.patientGender,
        nationality: c.patientNationality,
        birthDate: c.patientBirthDate,
        consultationDate: c.consultationDate,
      }))
  }, [consultationsData])

  const isLoading = loadingRecent || loadingAll

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
        <button onClick={() => router.back()} className="w-6 flex items-center justify-center" aria-label="Back">
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <path d="M10 2L2 10L10 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">{t.report_flow.title}</h1>
        <button onClick={() => router.back()} className="w-6 flex items-center justify-center" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="px-4 pt-7 pb-4">
          {/* 타이틀 */}
          <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-6 whitespace-pre-line">
            {t.report_flow.patient_select_title}
          </h2>

          {/* 스텝 인디케이터 */}
          <div className="flex gap-2 mb-8">
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#f3f9ff] shrink-0">
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4.5L4.5 8L11 1" stroke="#2592ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#2592ff] text-white text-base font-semibold shrink-0">
              2
            </div>
            {[3, 4, 5, 6].map(n => (
              <div key={n} className="w-6 h-6 rounded-full flex items-center justify-center bg-[#F7F7F7] text-[#808080] text-base font-semibold shrink-0">
                {n}
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : (
          <div className="space-y-7 pb-36">
            {/* 최근 진료 */}
            {recentPatients.length > 0 && (
              <div className="px-4">
                <p className="text-[16px] font-medium text-[#161616] mb-3">{t.report_flow.recent_visit}</p>
                <div className="grid grid-cols-2 gap-3">
                  {recentPatients.map(p => {
                    const isSelected = selectedId === p.id
                    const age = calcAge(p.birthDate)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : p.id)}
                        className={`rounded-[8px] p-4 flex flex-col gap-2 border transition-all text-left ${
                          isSelected ? 'border-[#2592ff] bg-[#f3f9ff]' : 'border-[#eee] bg-white'
                        }`}
                      >
                        <GenderAvatar gender={p.gender} />
                        <p className="text-[18px] font-medium text-[#161616] truncate w-full">{p.name}</p>
                        {age !== null && <p className="text-[16px] text-[#494949]">{t.patient.age_years(age)}</p>}
                        <div className="bg-[#f7f7f7] rounded-[8px] px-3 py-1.5 self-start">
                          <span className="text-[14px] font-medium text-[#494949]">
                            {getDateLabel(p.consultationDate, t.common.today, t.common.yesterday)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 전체 */}
            {patientsData.length > 0 && (
              <div className="px-4">
                <p className="text-[16px] font-medium text-[#161616] mb-3">{t.report_flow.all_patients}</p>
                <div className="grid grid-cols-2 gap-3">
                  {patientsData.map(p => {
                    const isSelected = selectedId === p.id
                    const age = calcAge(p.birthDate)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedId(isSelected ? null : p.id)}
                        className={`rounded-[8px] p-4 flex flex-col gap-2 border transition-all text-left ${
                          isSelected ? 'border-[#2592ff] bg-[#f3f9ff]' : 'border-[#eee] bg-white'
                        }`}
                      >
                        <GenderAvatar gender={p.gender} />
                        <p className="text-[18px] font-medium text-[#161616] truncate w-full">{p.name}</p>
                        {age !== null && <p className="text-[16px] text-[#494949]">{t.patient.age_years(age)}</p>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {recentPatients.length === 0 && patientsData.length === 0 && (
              <div className="py-16 text-center text-sm text-[#808080]">
                {t.report_flow.no_patient_info}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8">
        <button
          type="button"
          onClick={() => selectedId && router.push(`/consultations/new?patientId=${selectedId}`)}
          disabled={!selectedId}
          className="w-full h-[60px] bg-[#2592ff] rounded-lg text-lg font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {t.report_flow.next_btn}
        </button>
      </div>
    </AppShell>
  )
}
