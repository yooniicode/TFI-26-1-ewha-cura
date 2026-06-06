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
import { getBodyPartImage, getDiseaseShortName } from '@/lib/bodyPartUtils'

function getTodayKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function formatDateGroup(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} (${dow})`
}

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

  const todayKST = getTodayKST()
  const upcoming = records.filter(c => c.consultationDate >= todayKST)
  const past = records.filter(c => c.consultationDate < todayKST)
  const sorted = [
    ...upcoming.sort((a, b) => a.consultationDate.localeCompare(b.consultationDate)),
    ...past.sort((a, b) => b.consultationDate.localeCompare(a.consultationDate)),
  ]

  // 날짜별 그룹핑 (순서 유지)
  const groups: { date: string; items: PatientReport[] }[] = []
  for (const r of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === r.consultationDate) {
      last.items.push(r)
    } else {
      groups.push({ date: r.consultationDate, items: [r] })
    }
  }

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_record.title} />

      <div className="bg-white px-4 pb-10 min-h-screen">
        <p className="text-[14px] text-[#808080] leading-[1.4] py-3 text-center">
          클릭하면 더욱 자세한 정보를 확인할 수 있어요
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
                    <Link
                      key={record.id}
                      href={`/my-records/${record.id}`}
                      className="flex items-start gap-4 py-4 border-b border-[#eee] active:opacity-70 transition-opacity"
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
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
