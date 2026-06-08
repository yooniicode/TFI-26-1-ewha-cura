'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import { patientApi, chatApi } from '@/lib/api'
import type { PatientReport } from '@/lib/types'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { getBodyPartImage, getDiseaseShortName, getIcdCode } from '@/lib/bodyPartUtils'
import { formatKoreanDate, formatKoreanDateTime, toDateKey } from '@/lib/dateFormat'
import { useRouter } from 'next/navigation'

function getTodayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function formatDateGroup(dateStr: string): string {
  return formatKoreanDate(dateStr)
}

function RecordDetailModal({ record, onClose }: { record: PatientReport; onClose: () => void }) {
  const router = useRouter()
  const { t } = useTranslation()
  const [chatLoading, setChatLoading] = useState(false)

  const diseaseName = getDiseaseShortName(record.diagnosisNameCode)
  const icdCode = getIcdCode(record.diagnosisNameCode)
  const bodyImage = getBodyPartImage(record)
  const hospitalDisplay = [record.hospitalName, record.department].filter(Boolean).join(' ')

  async function handleOpenChat() {
    if (!record.interpreterId) return
    setChatLoading(true)
    try {
      const res = await chatApi.roomWithInterpreter(record.interpreterId)
      if (res.payload) router.push(`/chat/${res.payload.id}`)
    } catch { /* ignore */ } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-[24px] max-h-[90vh] overflow-y-auto pb-safe">
        {/* 핸들 + 닫기 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex-1" />
          <div className="w-10 h-1 rounded-full bg-[#eee] mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f0f1f5]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#494949" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-10 flex flex-col gap-4">
          {/* 신체 부위 이미지 */}
          <div className="w-full rounded-[20px] overflow-hidden bg-[#f0f1f5]" style={{ aspectRatio: '300/219' }}>
            <img src={bodyImage} alt="" className="w-full h-full object-cover" />
          </div>

          {/* 병명 + ICD 코드 */}
          <div className="flex items-center justify-between">
            <span className="text-[20px] font-semibold text-[#2592ff] leading-[1.4]">
              {diseaseName || hospitalDisplay || '-'}
            </span>
            {icdCode && (
              <div className="bg-[#f0f1f5] rounded-full px-3 h-8 flex items-center shrink-0">
                <span className="text-[16px] font-medium text-[#808080] leading-[1.4]">{icdCode}</span>
              </div>
            )}
          </div>

          <div className="border-t border-[#eee]" />

          <div className="flex flex-col gap-4">
            {record.treatmentResult && (
              <div className="bg-[#f3f9ff] rounded-[16px] px-3 py-2">
                <p className="text-[16px] font-medium text-[#2592ff] leading-[1.4]">{record.treatmentResult}</p>
              </div>
            )}
            {record.patientComment && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.medical_record.symptoms}</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.patientComment}</p>
              </div>
            )}
            {record.diagnosisContent && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.medical_record.diagnosis}</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.diagnosisContent}</p>
              </div>
            )}
            {record.medicationInstruction && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.medical_record.medication}</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.medicationInstruction}</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#eee]" />

          <div className="flex gap-4">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.consultation.visit_date_label}</p>
              <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">
                {formatKoreanDateTime(record.consultationDate)}
              </p>
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.consultation.visit_hospital}</p>
              <p className="text-[16px] font-medium text-[#494949] leading-[1.4] truncate">
                {hospitalDisplay || '-'}
              </p>
            </div>
          </div>

          {record.interpreterName && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.mypage.interpreter_label}</p>
              <div className="flex items-center gap-1">
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.interpreterName}님</p>
                {record.interpreterId && (
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    disabled={chatLoading}
                    className="w-6 h-6 rounded-full bg-[#f0f1f5] flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {record.nextAppointmentDate && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">{t.medical_record.next_appointment}</p>
              <p className="text-[16px] font-semibold text-[#2592ff] leading-[1.4]">
                {formatKoreanDateTime(record.nextAppointmentDate)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MyRecordsPage() {
  const { data: me, isLoading: meLoading } = useMe()
  const { t } = useTranslation()
  const [records, setRecords] = useState<PatientReport[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<PatientReport | null>(null)

  useEffect(() => {
    const patientId = me?.entityId
    if (!patientId) return
    setLoading(true)
    patientApi.myRecords(patientId)
      .then(r => setRecords(r.payload ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [me?.entityId])

  if (meLoading || loading) {
    return (
      <AppShell noPadding>
        <PageHeader title={t.medical_record.title} />
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }

  const todayKST = getTodayKST()
  const upcoming = records.filter(c => toDateKey(c.consultationDate) >= todayKST)
  const past = records.filter(c => toDateKey(c.consultationDate) < todayKST)
  const sorted = [
    ...upcoming.sort((a, b) => a.consultationDate.localeCompare(b.consultationDate)),
    ...past.sort((a, b) => b.consultationDate.localeCompare(a.consultationDate)),
  ]

  const groups: { date: string; items: PatientReport[] }[] = []
  for (const r of sorted) {
    const dateKey = toDateKey(r.consultationDate)
    const last = groups[groups.length - 1]
    if (last && last.date === dateKey) {
      last.items.push(r)
    } else {
      groups.push({ date: dateKey, items: [r] })
    }
  }

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_record.title} />

      <div className="bg-white px-4 pb-10 min-h-screen">
        <p className="text-[14px] text-[#808080] leading-[1.4] py-3 text-center">
          {t.medical_record.click_hint}
        </p>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center">
              <img src="/icons/immigrant/home/진료기록.svg" alt="" width={28} height={28} />
            </div>
            <p className="text-sm text-[#A0A0A0] text-center">{t.medical_record.no_records}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(({ date, items }) => (
              <div key={date} className="flex flex-col">
                <div className="py-1">
                  <p className="text-[16px] font-medium text-[#494949]">{formatDateGroup(date)}</p>
                </div>
                {items.map(record => {
                  const diseaseName = getDiseaseShortName(record.diagnosisNameCode)
                  const bodyImage = getBodyPartImage(record)
                  const hospitalDisplay = [record.hospitalName, record.department].filter(Boolean).join(' ')
                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="flex items-start gap-4 py-4 border-b border-[#eee] active:opacity-70 transition-opacity text-left w-full"
                    >
                      <div className="shrink-0 w-[100px] h-[103px] rounded-[8px] bg-[#f0f1f5] overflow-hidden">
                        <img src={bodyImage} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col justify-between self-stretch flex-1 min-w-0 py-0.5">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[20px] font-semibold text-[#2592ff] leading-[1.4]">
                            {diseaseName || hospitalDisplay || '-'}
                          </p>
                          {record.diagnosisContent && (
                            <p className="text-[16px] font-medium text-[#161616] leading-[1.4] line-clamp-1">
                              {record.diagnosisContent}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 mt-1">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                          </svg>
                          <p className="text-[16px] text-[#808080] leading-[1.4] truncate ml-0.5">
                            {hospitalDisplay || t.my_records.no_hospital}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </AppShell>
  )
}
