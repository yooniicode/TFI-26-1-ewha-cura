'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import StepIndicator from '@/components/interpreter/StepIndicator'
import { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
import { patientApi, consultationApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Patient } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/I18nContext'

function calcAge(birthDate?: string | null) {
  if (!birthDate) return ''
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
  return `만 ${age}세`
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<AppShell noPadding><Spinner /></AppShell>}>
      <ScheduleInner />
    </Suspense>
  )
}

function ScheduleInner() {
  const router = useRouter()
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [hospitalName, setHospitalName] = useState('')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: queryKeys.patients.list(0),
    queryFn: () => patientApi.list(0).then(r => r.payload ?? []),
  })

  const myPatients = patients.filter(p => p.assignedToMe)

  async function handleSave() {
    if (!selectedPatient) return
    setSaving(true); setError('')
    try {
      await consultationApi.create({
        patientId: selectedPatient.id,
        consultationDate: date,
        issueType: 'MEDICAL',
        processing: 'INTERPRETATION',
        hospitalName: hospitalName.trim() || undefined,
        department: department.trim() || undefined,
      })
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : t.schedule.err_save)
      setSaving(false)
    }
  }

  return (
    <AppShell noPadding>
      <PageHeader title={t.schedule.title} showClose />

      {/* Step 1 — 환자 선택 */}
      {step === 1 && (
        <>
          <div className="bg-white px-6 pt-7 pb-5">
            <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-2 whitespace-pre-line">
              {t.schedule.select_patient_title}
            </h2>
            <p className="text-sm text-[#808080] mb-6">{t.schedule.select_patient_desc}</p>
            <StepIndicator current={1} total={2} />
          </div>

          <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : myPatients.length === 0 ? (
              <div className="bg-white rounded-2xl px-5 py-10 text-center">
                <p className="text-sm text-[#A0A0A0]">{t.schedule.no_patients}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myPatients.map(p => {
                  const isSelected = selectedPatient?.id === p.id
                  const flagSrc = getFlagSrc(p.nationality)
                  const age = calcAge(p.birthDate)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatient(isSelected ? null : p)}
                      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-4 border-2 transition-all text-left ${
                        isSelected ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-transparent bg-white hover:border-[#EEEEEE]'
                      }`}
                    >
                      {/* 성별 아이콘 */}
                      <div className="relative shrink-0">
                        <img
                          src={p.gender === 'FEMALE' ? '/icons/common/gender/small-여성-배경o.svg' : '/icons/common/gender/small-남성-배경o.svg'}
                          alt=""
                          width={40}
                          height={40}
                        />
                        {flagSrc && (
                          <img src={flagSrc} alt="" width={14} height={14} className="absolute -bottom-0.5 -right-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[#161616] truncate">{p.name}</p>
                        {age && <p className="text-sm text-[#808080]">{age}</p>}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#2592FF] flex items-center justify-center shrink-0">
                          <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
                            <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!selectedPatient}
              className="w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 transition-opacity"
            >
              {t.schedule.next_btn}
            </button>
          </div>
        </>
      )}

      {/* Step 2 — 날짜·장소 선택 */}
      {step === 2 && selectedPatient && (
        <>
          <div className="bg-white px-6 pt-7 pb-5">
            <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-2 whitespace-pre-line">
              {t.schedule.when_where_title}
            </h2>
            <p className="text-sm text-[#808080] mb-6">{selectedPatient.name}</p>
            <StepIndicator current={2} total={2} />
          </div>

          <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
            <div className="bg-white rounded-2xl px-5 py-5 space-y-4">

              {/* 날짜 */}
              <div>
                <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.schedule.visit_date}</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none border border-[#A1A1A1]"
                />
              </div>

              {/* 병원 */}
              <div>
                <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.schedule.hospital} <span className="text-[#A0A0A0] font-normal">{t.schedule.hospital_optional}</span></label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={e => setHospitalName(e.target.value)}
                  placeholder={t.schedule.hospital_placeholder}
                  className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                />
              </div>

              {/* 진료과 */}
              <div>
                <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.schedule.department} <span className="text-[#A0A0A0] font-normal">{t.schedule.department_optional}</span></label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder={t.schedule.department_placeholder}
                  className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8 flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-[100px] h-[60px] bg-[#F0F1F5] rounded-2xl text-base font-semibold text-[#494949] hover:bg-[#e4e4e8] transition-colors"
            >
              {t.schedule.prev_btn}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !date}
              className="flex-1 h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors"
            >
              {saving ? t.schedule.saving : t.schedule.add_btn}
            </button>
          </div>
        </>
      )}
    </AppShell>
  )
}
