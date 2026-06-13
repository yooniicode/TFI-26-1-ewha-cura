'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { consultationApi, patientApi } from '@/lib/api'
import type { Patient } from '@/lib/types'
import Spinner from '@/components/ui/Spinner'

/* ── 오늘 날짜 기본값 ─────────────────────────── */
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function ScheduleNewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  /* 환자 목록 */
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientLoading, setPatientLoading] = useState(true)
  const [patientQuery, setPatientQuery] = useState('')

  /* 폼 필드 */
  const [patientId, setPatientId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [hospitalName, setHospitalName] = useState('')
  const [department, setDepartment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  /* 담당 환자 로드 */
  useEffect(() => {
    setPatientLoading(true)
    patientApi.list(0, patientQuery || undefined, 50)
      .then(r => {
        const all = r.payload ?? []
        // 담당 환자(assignedToMe) 우선 정렬
        setPatients(all.sort((a, b) =>
          (b.assignedToMe ? 1 : 0) - (a.assignedToMe ? 1 : 0)
        ))
      })
      .catch(() => setPatients([]))
      .finally(() => setPatientLoading(false))
  }, [patientQuery])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId || !date) return
    setSubmitting(true)
    setError('')
    try {
      await consultationApi.create({
        patientId,
        consultationDate: date,
        issueType: 'MEDICAL',
        processing: 'INTERPRETATION',
        hospitalName: hospitalName.trim() || undefined,
        department: department.trim() || undefined,
      })
      // 대시보드 캐시 무효화 → 홈화면 일정 즉시 갱신
      await queryClient.invalidateQueries({ queryKey: ['consultations'] })
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : '일정 생성에 실패했습니다.')
      setSubmitting(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === patientId)
  const filteredPatients = patientQuery
    ? patients.filter(p => p.name.includes(patientQuery))
    : patients

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f6]" style={{ maxWidth: 402, margin: '0 auto' }}>

      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex h-[56px] items-center bg-white px-4 border-b border-[#f0f0f0]">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center"
          aria-label="뒤로"
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M9 1L1 8.5L9 16" stroke="#414141" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[16px] font-semibold text-[#414141]">통역 일정 추가</h1>
        <div className="w-10" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 pt-5 pb-8">

        {/* 환자 선택 */}
        <div className="rounded-2xl bg-white px-5 py-4">
          <p className="mb-3 text-[14px] font-semibold text-[#7f7f7f] tracking-wide">환자 선택</p>

          {/* 검색 */}
          <input
            type="text"
            value={patientQuery}
            onChange={e => setPatientQuery(e.target.value)}
            placeholder="이름으로 검색"
            className="mb-3 w-full h-[40px] rounded-xl bg-[#f6f6f6] px-4 text-[14px] text-[#484848] placeholder:text-[#c6c6c6] focus:outline-none"
          />

          {patientLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : filteredPatients.length === 0 ? (
            <p className="py-4 text-center text-[14px] text-[#7f7f7f]">담당 환자가 없습니다</p>
          ) : (
            <div className="max-h-[220px] overflow-y-auto -mx-1 px-1 space-y-1">
              {filteredPatients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPatientId(p.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors
                    ${patientId === p.id
                      ? 'bg-[#2592ff] text-white'
                      : 'bg-[#f6f6f6] text-[#161616] hover:bg-[#eef5ff]'
                    }`}
                >
                  <div>
                    <span className="text-[16px] font-medium">{p.name}</span>
                    {p.assignedToMe && (
                      <span className={`ml-2 text-[12px] ${patientId === p.id ? 'text-blue-100' : 'text-[#2592ff]'}`}>
                        담당
                      </span>
                    )}
                  </div>
                  {patientId === p.id && (
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path d="M1 6l4 4L15 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 날짜 */}
        <div className="rounded-2xl bg-white px-5 py-4">
          <p className="mb-3 text-[14px] font-semibold text-[#7f7f7f] tracking-wide">진료 날짜</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full h-[44px] rounded-xl bg-[#f6f6f6] px-4 text-[16px] text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#2592ff]/30"
          />
        </div>

        {/* 병원 정보 */}
        <div className="rounded-2xl bg-white px-5 py-4">
          <p className="mb-3 text-[14px] font-semibold text-[#7f7f7f] tracking-wide">병원 정보 (선택)</p>
          <div className="space-y-2">
            <input
              type="text"
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
              placeholder="병원명 (예: 부산의료원)"
              className="w-full h-[44px] rounded-xl bg-[#f6f6f6] px-4 text-[16px] text-[#161616] placeholder:text-[#c6c6c6] focus:outline-none"
            />
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="진료과 (예: 산부인과)"
              className="w-full h-[44px] rounded-xl bg-[#f6f6f6] px-4 text-[16px] text-[#161616] placeholder:text-[#c6c6c6] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-500">{error}</p>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={!patientId || !date || submitting}
          className="mt-2 h-[60px] w-full rounded-2xl bg-[#2592ff] text-[18px] font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {submitting ? '추가 중...' : '일정 추가'}
        </button>
      </form>
    </div>
  )
}
