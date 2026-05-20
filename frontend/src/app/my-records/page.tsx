'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { patientApi, scriptApi, chatApi } from '@/lib/api'
import type { MedicalScript, PatientReport } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useMe } from '@/hooks/useMe'

export default function MyRecordsPage() {
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const router = useRouter()
  const { data: me, isLoading: meLoading } = useMe()
  const [records, setRecords] = useState<PatientReport[]>([])
  const [scripts, setScripts] = useState<MedicalScript[]>([])
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState<string | null>(null)

  useEffect(() => {
    const patientId = me?.entityId
    if (!patientId) return
    setLoading(true)
    Promise.all([
      patientApi.myRecords(patientId),
      scriptApi.byPatient(patientId),
    ]).then(([rRes, sRes]) => {
      setRecords(rRes.payload ?? [])
      setScripts(sRes.payload ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [me?.entityId])

  async function handleOpenChat(interpreterId: string) {
    setChatLoading(interpreterId)
    try {
      const res = await chatApi.roomWithInterpreter(interpreterId)
      if (res.payload) router.push(`/chat/${res.payload.id}`)
    } catch { /* ignore */ } finally {
      setChatLoading(null)
    }
  }

  if (meLoading || loading) {
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
          <h1 className="text-base font-semibold text-[#424242]">{t.my_records.title}</h1>
        </div>
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center justify-between">
        <h1 className="text-base font-semibold text-[#424242]">{t.my_records.title}</h1>
        {me?.entityId && (
          <Link
            href={`/scripts/patient/${me.entityId}`}
            className="bg-[#2592FF] text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            {t.my_records.new_script}
          </Link>
        )}
      </div>

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-4">
        {/* 진료 기록 */}
        <div>
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">{t.my_records.patient_records_section}</p>
          {records.length === 0 ? (
            <EmptyState message={t.my_records.no_records} />
          ) : (
            <div className="space-y-3">
              {records.map(c => (
                <div key={c.id} className="bg-white rounded-xl px-4 py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#161616]">{c.consultationDate}</p>
                      <p className="text-sm text-[#808080] mt-0.5">
                        {c.hospitalName ?? t.my_records.no_hospital}
                        {c.department && ` · ${c.department}`}
                        {c.doctorName && ` · ${c.doctorName}`}
                      </p>
                    </div>
                    {c.interpreterId && (
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-[#2592FF] border border-[#2592FF] rounded-lg px-2.5 py-1.5 hover:bg-blue-50"
                        disabled={chatLoading === c.interpreterId}
                        onClick={() => handleOpenChat(c.interpreterId!)}
                      >
                        {chatLoading === c.interpreterId ? '...' : t.chat.open_chat}
                      </button>
                    )}
                  </div>
                  {c.diagnosisNameCode && (
                    <p className="text-sm font-medium text-[#161616] mt-2">{t.my_records.diagnosis_label}: {c.diagnosisNameCode}</p>
                  )}
                  {c.diagnosisContent && (
                    <InfoBlock label={t.my_records.diagnosis_content} value={c.diagnosisContent} />
                  )}
                  {c.treatmentResult && (
                    <InfoBlock label={t.my_records.treatment_result} value={c.treatmentResult} />
                  )}
                  {c.medicationInstruction && (
                    <InfoBlock label={t.my_records.medication} value={c.medicationInstruction} />
                  )}
                  {c.nextAppointmentDate && (
                    <p className="text-xs text-[#2592FF] mt-3">
                      {t.my_records.next_appointment}: {c.nextAppointmentDate}
                    </p>
                  )}
                  {c.patientComment && (
                    <InfoBlock label={t.my_records.patient_comment} value={c.patientComment} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 의료 스크립트 */}
        <div>
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">{t.my_records.scripts_section}</p>
          {scripts.length === 0 ? (
            <EmptyState message={t.my_records.no_scripts} />
          ) : (
            <div className="space-y-3">
              {scripts.map(s => (
                <div key={s.id} className="bg-white rounded-xl px-4 py-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-[#2592FF]">
                      {labels.script[s.scriptType]}
                    </span>
                    <span className="text-xs text-[#A0A0A0]">
                      {new Date(s.createdAt).toLocaleDateString(t.locale)}
                    </span>
                  </div>
                  <p className="text-sm text-[#494949] line-clamp-2 mt-1">{s.contentKo}</p>
                  <Link
                    href={`/scripts/${s.id}/present`}
                    className="mt-3 block text-center py-2.5 rounded-lg bg-[#EAF4FF] text-[#2592FF] text-sm font-semibold"
                  >
                    {t.my_records.show_doctor}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-[#808080] mb-1">{label}</p>
      <p className="text-sm text-[#161616] whitespace-pre-wrap">{value}</p>
    </div>
  )
}
