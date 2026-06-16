'use client'

import Image from 'next/image'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/layout/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import StepIndicator from '@/components/ui/StepIndicator'
import { getFlagSrc } from '@/components/patient/PatientInfoBar'
import PatientAvatar from '@/components/patient/PatientAvatar'
import { consultationApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { PendingConsultation } from '@/lib/schemas'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { CalendarPicker } from '@/components/ui/DateTimePicker'

function formatPreferredDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toLocalDatetimeValue(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
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
  const [selected, setSelected] = useState<PendingConsultation | null>(null)
  const [dateTbd, setDateTbd] = useState(false)
  const [dateOnly, setDateOnly] = useState('')
  const [timeOnly, setTimeOnly] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: requests = [], isLoading } = useQuery<PendingConsultation[]>({
    queryKey: queryKeys.consultations.pending(),
    queryFn: () => consultationApi.pending().then(r => r.payload ?? []),
  })

  function handleSelectRequest(req: PendingConsultation) {
    setSelected(req === selected ? null : req)
    const combined = toLocalDatetimeValue(req.consultationDate)
    setDateOnly(combined.slice(0, 10))
    setTimeOnly(combined.slice(11, 16))
    setDateTbd(false)
  }

  async function handleAccept() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      await consultationApi.accept(selected.id, {
        consultationDate: dateTbd ? null : (dateOnly ? `${dateOnly}T${timeOnly || '00:00'}` : null),
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

      {/* Step 1 — 요청 목록 */}
      {step === 1 && (
        <>
          <div className="bg-white px-4 pt-7 pb-5">
            <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-2 whitespace-pre-line">
              {t.schedule.select_request_title}
            </h2>
            <p className="text-sm text-[#808080] mb-6">{t.schedule.select_request_desc}</p>
            <StepIndicator current={1} total={2} />
          </div>

          <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen pb-32">
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl px-5 py-10 text-center">
                <p className="text-sm text-[#A0A0A0]">{t.schedule.no_pending}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map(req => {
                  const isSelected = selected?.id === req.id
                  const flagSrc = req.patientNationality ? getFlagSrc(req.patientNationality) : null
                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => handleSelectRequest(req)}
                      className={`w-full flex items-start gap-3 rounded-2xl px-4 py-4 border-2 transition-all text-left ${
                        isSelected ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-transparent bg-white hover:border-[#EEEEEE]'
                      }`}
                    >
                      {/* 프로필 (아바타 or 성별) + 국기 */}
                      <div className="relative shrink-0 mt-0.5">
                        <PatientAvatar avatarUrl={req.patientAvatarUrl} gender={req.patientGender} size="md" />
                        {flagSrc && (
                          <Image src={flagSrc} alt="" width={14} height={14} className="absolute -bottom-0.5 -right-0.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[#161616] truncate">{req.patientName}</p>
                        <p className="text-xs text-[#2592FF] mt-0.5">
                          {t.schedule.preferred_date}: {formatPreferredDate(req.consultationDate)}
                        </p>
                        {req.patientComment ? (
                          <p className="text-sm text-[#494949] mt-1.5 line-clamp-2 whitespace-pre-line">
                            {req.patientComment}
                          </p>
                        ) : (
                          <p className="text-sm text-[#A0A0A0] mt-1.5">{t.schedule.no_comment}</p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#2592FF] flex items-center justify-center shrink-0 mt-1">
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

          <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!selected}
              className="w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 transition-opacity"
            >
              {t.schedule.next_btn}
            </button>
          </div>
        </>
      )}

      {/* Step 2 — 일정 확정 */}
      {step === 2 && selected && (
        <>
          <div className="bg-white px-4 pt-7 pb-5">
            <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-2 whitespace-pre-line">
              {t.schedule.confirm_date_title}
            </h2>
            <p className="text-sm text-[#808080] mb-6">{selected.patientName}</p>
            <StepIndicator current={2} total={2} />
          </div>

          <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen pb-32">
            <div className="bg-white rounded-2xl px-5 py-5 space-y-4">

              {/* 이주민 요청사항 요약 */}
              {selected.patientComment && (
                <div className="bg-[#F3F9FF] rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-[#2592FF] mb-1">{t.schedule.patient_comment}</p>
                  <p className="text-sm text-[#494949] whitespace-pre-line">{selected.patientComment}</p>
                </div>
              )}

              {/* 일정 미정 토글 */}
              <button
                type="button"
                onClick={() => setDateTbd(v => !v)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border-2 transition-all text-left ${
                  dateTbd ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-[#E8E8E8] bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  dateTbd ? 'border-[#2592FF] bg-[#2592FF]' : 'border-[#D0D0D0]'
                }`}>
                  {dateTbd && (
                    <svg width="10" height="8" viewBox="0 0 12 9" fill="none">
                      <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#161616]">{t.schedule.date_tbd_label}</p>
                  <p className="text-xs text-[#808080] mt-0.5">{t.schedule.date_tbd_desc}</p>
                </div>
              </button>

              {/* 날짜 입력 */}
              {!dateTbd && (
                <div>
                  <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.schedule.visit_date}</label>
                  <CalendarPicker
                    value={dateOnly}
                    onChange={setDateOnly}
                    time={timeOnly}
                    onTimeChange={setTimeOnly}
                  />
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto bg-white border-t border-[#EEEEEE] px-4 pt-4 pb-8 flex gap-2.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-[100px] h-[60px] bg-[#F0F1F5] rounded-2xl text-base font-semibold text-[#494949] hover:bg-[#e4e4e8] transition-colors"
            >
              {t.schedule.prev_btn}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={saving || (!dateTbd && !dateOnly)}
              className="flex-1 h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors"
            >
              {saving ? t.schedule.saving : t.schedule.accept_btn}
            </button>
          </div>
        </>
      )}
    </AppShell>
  )
}
