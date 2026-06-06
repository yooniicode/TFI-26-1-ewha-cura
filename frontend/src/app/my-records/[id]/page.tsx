'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import { patientApi, chatApi } from '@/lib/api'
import type { PatientReport } from '@/lib/types'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { getBodyPartImage, getDiseaseShortName, getIcdCode } from '@/lib/bodyPartUtils'

function consultDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
}

export default function MyRecordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: me } = useMe()
  const { t } = useTranslation()

  const [record, setRecord] = useState<PatientReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const patientId = me?.entityId
    if (!patientId) return
    patientApi.myRecords(patientId)
      .then(r => {
        const found = (r.payload ?? []).find(c => c.id === id)
        setRecord(found ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, me?.entityId])

  async function handleOpenChat() {
    if (!record?.interpreterId) return
    setChatLoading(true)
    try {
      const res = await chatApi.roomWithInterpreter(record.interpreterId)
      if (res.payload) router.push(`/chat/${res.payload.id}`)
    } catch { /* ignore */ } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <AppShell noPadding>
        <PageHeader title={t.medical_record.detail_title} />
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }

  if (!record) {
    return (
      <AppShell noPadding>
        <PageHeader title={t.medical_record.detail_title} />
        <p className="text-center py-10 text-[#A0A0A0]">{t.medical_record.not_found}</p>
      </AppShell>
    )
  }

  const diseaseName = getDiseaseShortName(record.diagnosisNameCode)
  const icdCode = getIcdCode(record.diagnosisNameCode)
  const bodyImage = getBodyPartImage(record)
  const hospitalDisplay = [record.hospitalName, record.department].filter(Boolean).join(' ')

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_record.detail_title} />

      <div className="bg-white px-4 py-4 pb-10 min-h-screen">
        <div className="bg-white border border-[#eee] rounded-[20px] overflow-hidden flex flex-col gap-4 px-4 py-6">

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

          {/* 구분선 */}
          <div className="border-t border-[#eee]" />

          {/* 내용 섹션 */}
          <div className="flex flex-col gap-4">
            {record.treatmentResult && (
              <div className="bg-[#f3f9ff] rounded-[16px] px-3 py-2">
                <p className="text-[16px] font-medium text-[#2592ff] leading-[1.4]">
                  {record.treatmentResult}
                </p>
              </div>
            )}
            {record.patientComment && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">증상</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.patientComment}</p>
              </div>
            )}
            {record.diagnosisContent && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">진단</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.diagnosisContent}</p>
              </div>
            )}
            {record.medicationInstruction && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">약 처방</p>
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">{record.medicationInstruction}</p>
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="border-t border-[#eee]" />

          {/* 날짜 + 병원 */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">날짜</p>
              <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">
                {consultDateKo(record.consultationDate)}
              </p>
            </div>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">병원</p>
              <p className="text-[16px] font-medium text-[#494949] leading-[1.4] truncate">
                {hospitalDisplay || '-'}
              </p>
            </div>
          </div>

          {/* 통번역가 */}
          {record.interpreterName && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">통번역가</p>
              <div className="flex items-center gap-1">
                <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">
                  {record.interpreterName}님
                </p>
                {record.interpreterId && (
                  <button
                    type="button"
                    onClick={handleOpenChat}
                    disabled={chatLoading}
                    className="w-6 h-6 rounded-full bg-[#f0f1f5] flex items-center justify-center shrink-0 disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13.6a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10.91a16 16 0 006.72 6.72l1.25-1.25a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 18.92v-2z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 다음 예약 */}
          {record.nextAppointmentDate && (
            <div className="flex flex-col gap-0.5">
              <p className="text-[14px] font-medium text-[#808080] leading-[1.4]">다음 예약</p>
              <p className="text-[16px] font-semibold text-[#2592ff] leading-[1.4]">
                {record.nextAppointmentDate}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
