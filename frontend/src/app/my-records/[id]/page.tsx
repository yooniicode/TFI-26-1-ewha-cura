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

function consultDateKo(dateStr: string, locale: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
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

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_record.detail_title} />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-10 space-y-3 min-h-screen">
        {/* 날짜 + 병원 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm text-[#A0A0A0]">{consultDateKo(record.consultationDate, t.locale)}</p>
          <h2 className="text-xl font-bold text-[#161616] mt-1">
            {record.hospitalName ?? t.my_records.no_hospital}
          </h2>
          {record.department && <p className="text-base text-[#808080] mt-0.5">{record.department}</p>}
          {record.doctorName && <p className="text-sm text-[#A0A0A0] mt-0.5">{record.doctorName}</p>}
          {record.interpreterName && (
            <p className="text-sm text-[#2592FF] mt-1">
              담당 통번역가: {record.interpreterName}
            </p>
          )}

          {record.interpreterId && (
            <button
              type="button"
              onClick={handleOpenChat}
              disabled={chatLoading}
              className="mt-4 w-full h-11 rounded-xl bg-[#EAF4FF] text-[#2592FF] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#dceeff] transition-colors disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              {chatLoading ? t.medical_record.connecting : t.medical_record.ask_interpreter}
            </button>
          )}
        </div>

        {(record.diagnosisNameCode || record.diagnosisContent) && (
          <Section title={t.medical_record.diagnosis}>
            {record.diagnosisNameCode && (
              <DiseaseNameDisplay code={record.diagnosisNameCode} />
            )}
            {record.diagnosisContent && <p className="text-sm text-[#494949] mt-2 leading-relaxed whitespace-pre-wrap">{record.diagnosisContent}</p>}
          </Section>
        )}

        {record.patientComment && (
          <Section title={t.medical_record.symptoms}>
            <p className="text-sm text-[#494949] leading-relaxed whitespace-pre-wrap">{record.patientComment}</p>
          </Section>
        )}

        {record.treatmentResult && (
          <Section title={t.medical_record.caution}>
            <p className="text-sm text-[#494949] leading-relaxed whitespace-pre-wrap">{record.treatmentResult}</p>
          </Section>
        )}

        {record.medicationInstruction && (
          <Section title={t.medical_record.medication}>
            <p className="text-sm text-[#494949] leading-relaxed whitespace-pre-wrap">{record.medicationInstruction}</p>
          </Section>
        )}

        {record.nextAppointmentDate && (
          <Section title={t.medical_record.next_appointment}>
            <p className="text-base font-semibold text-[#2592FF]">{record.nextAppointmentDate}</p>
          </Section>
        )}
      </div>
    </AppShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl px-5 py-4">
      <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )
}

// ─── HIRA 질병정보 표시 ──────────────────────────────────────────────────────

interface DiseaseResult { code: string; name: string }

function DiseaseNameDisplay({ code }: { code: string }) {
  const [enriched, setEnriched] = useState<DiseaseResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) return
    // 저장된 값에서 ICD 코드 추출 (예: "급성비인두염 (J00)" → "J00")
    const icdMatch = code.match(/\(([A-Z][0-9]+(?:\.[0-9]+)?)\)/)
    const searchQuery = icdMatch ? icdMatch[1] : code

    setLoading(true)
    fetch(`/api/disease-search?q=${encodeURIComponent(searchQuery)}`)
      .then(r => r.json())
      .then((data: { results: DiseaseResult[] }) => {
        if (data.results.length > 0) setEnriched(data.results[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <svg className="animate-spin w-3.5 h-3.5 text-[#2592FF]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="text-sm text-[#A0A0A0]">병명 조회 중...</span>
      </div>
    )
  }

  if (enriched) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-[#161616]">{enriched.name}</p>
          <span className="text-xs font-semibold text-[#2592FF] bg-[#EAF4FF] px-2 py-0.5 rounded-full">
            {enriched.code}
          </span>
        </div>
        <p className="text-[10px] text-[#A0A0A0]">출처: 건강보험심사평가원 질병정보</p>
      </div>
    )
  }

  // API 조회 실패 또는 미사용 → 저장된 값 그대로 표시
  return <p className="text-base font-semibold text-[#161616]">{code}</p>
}
