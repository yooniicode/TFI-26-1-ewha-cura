'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/interpreter/PageHeader'
import { patientApi } from '@/lib/api'
import type { PatientReport } from '@/lib/types'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function MyRecordsPage() {
  const { data: me, isLoading: meLoading } = useMe()
  const { t } = useTranslation()
  const [records, setRecords] = useState<PatientReport[]>([])
  const [loading, setLoading] = useState(false)

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

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_record.title} />

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <img src="/icons/immigrant/home/진료기록.svg" alt="" width={28} height={28} />
            </div>
            <p className="text-sm text-[#A0A0A0] text-center">{t.medical_record.no_records}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map(c => (
              <Link
                key={c.id}
                href={`/my-records/${c.id}`}
                className="flex items-center bg-white rounded-2xl px-4 py-4 gap-4 hover:shadow-sm transition-shadow"
              >
                <div className="shrink-0 w-12 flex flex-col items-center">
                  <span className="text-[10px] text-[#A0A0A0]">
                    {new Date(c.consultationDate + 'T00:00:00').getFullYear()}
                  </span>
                  <span className="text-lg font-bold text-[#161616] leading-tight">
                    {String(new Date(c.consultationDate + 'T00:00:00').getDate()).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-[#808080]">
                    {String(new Date(c.consultationDate + 'T00:00:00').getMonth() + 1).padStart(2, '0')}월
                  </span>
                </div>
                <div className="w-px h-10 bg-[#EEEEEE] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[#161616] truncate">
                    {c.hospitalName ?? t.my_records.no_hospital}
                    {c.department ? ` · ${c.department}` : ''}
                  </p>
                  <p className="text-sm text-[#808080] mt-0.5 truncate">
                    {c.diagnosisNameCode || c.diagnosisContent || t.medical_record.no_records}
                  </p>
                  {c.nextAppointmentDate && (
                    <p className="text-xs text-[#2592FF] mt-1">{t.medical_record.next_appointment}: {c.nextAppointmentDate}</p>
                  )}
                </div>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
                  <path d="M1 1l6 6-6 6" stroke="#C7C7C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
