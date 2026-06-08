'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { getFlagSrc } from '@/components/interpreter/PatientInfoBar'
import { matchApi, patientApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import type { Nationality, PageInfo, Patient } from '@/lib/types'
import { NATIONALITIES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function PatientsPage() {
  const { data: me, isLoading: meLoading } = useMe()
  const { t } = useTranslation()
  const labels = useEnumLabels()

  const [items, setItems] = useState<Patient[]>([])
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState<PageInfo | undefined>()
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState<Nationality | ''>('')
  const [matchingPatientId, setMatchingPatientId] = useState<string | null>(null)
  const [matchError, setMatchError] = useState('')
  const [listError, setListError] = useState('')

  useEffect(() => {
    if (me?.role !== 'interpreter') { setLoading(false); return }
    let cancelled = false
    setLoading(true); setListError('')
    patientApi.list(page, submittedQuery)
      .then(r => {
        if (!cancelled) {
          setItems(r.payload ?? [])
          setPageInfo(r.pageInfo)
        }
      })
      .catch(e => {
        if (!cancelled) { setItems([]); setListError(e instanceof Error ? e.message : t.patient.empty) }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [me?.role, me?.authUserId, page, submittedQuery, t.patient.empty])

  async function handleSelfAssign(patient: Patient) {
    setMatchingPatientId(patient.id); setMatchError('')
    try {
      const res = await matchApi.selfAssign(patient.id)
      const match = res.payload
      setItems(cur => cur.map(p =>
        p.id === patient.id
          ? { ...p, assignedToMe: true, activeInterpreterId: match.interpreterId, activeInterpreterName: match.interpreterName }
          : p
      ))
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : t.patient.err_self_match)
    } finally {
      setMatchingPatientId(null)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setSubmittedQuery(query.trim())
  }

  const filtered = nationalityFilter
    ? items.filter(p => p.nationality === nationalityFilter)
    : items

  const myPatients = filtered.filter(p => p.assignedToMe)
  const otherPatients = filtered.filter(p => !p.assignedToMe)

  if (meLoading) return <AppShell noPadding><Spinner /></AppShell>

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
        <h1 className="text-base font-semibold text-[#161616]">담당 환자</h1>
      </div>

      {/* 검색 + 국가 필터 */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-[#EEEEEE] space-y-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="flex-1 bg-[#F5F5F5] rounded-lg px-4 py-2.5 text-base outline-none placeholder:text-[#A0A0A0] text-[#161616]"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.patient.search_placeholder}
          />
          <button type="submit" className="bg-[#2592FF] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shrink-0">
            {t.common.search}
          </button>
        </form>

        {/* 국가별 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setNationalityFilter('')}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              nationalityFilter === '' ? 'bg-[#2592FF] text-white' : 'bg-[#F0F0F0] text-[#494949]'
            }`}
          >
            전체
          </button>
          {NATIONALITIES.filter(n => n !== 'OTHER' && n !== 'KOREA' && n !== 'UNITED_STATES').map(n => {
            const flagSrc = getFlagSrc(n)
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNationalityFilter(prev => prev === n ? '' : n)}
                className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  nationalityFilter === n ? 'bg-[#2592FF] text-white' : 'bg-[#F0F0F0] text-[#494949]'
                }`}
              >
                {flagSrc && <Image src={flagSrc} alt="" width={14} height={14} />}
                {labels.nationality[n]}
              </button>
            )
          })}
        </div>

        {matchError && <p className="text-xs text-red-500">{matchError}</p>}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="bg-[#F5F5F5] min-h-screen flex items-center justify-center pt-20">
          <Spinner />
        </div>
      ) : listError ? (
        <div className="bg-[#F5F5F5] min-h-screen px-4 py-8 text-center">
          <p className="text-sm text-red-500">{listError}</p>
        </div>
      ) : (
        <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-5">

          {/* ── 내 담당 환자 ─────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold text-[#161616]">내 담당 환자</h2>
              <span className="rounded-full bg-[#2592FF] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {myPatients.length}
              </span>
            </div>

            {myPatients.length === 0 ? (
              <div className="bg-white rounded-2xl px-4 py-8 text-center">
                <p className="text-sm text-[#A0A0A0]">담당 환자가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myPatients.map(p => <PatientCard key={p.id} patient={p} labels={labels} t={t} matchingPatientId={matchingPatientId} onSelfAssign={handleSelfAssign} showAssignedBadge={false} />)}
              </div>
            )}
          </section>

          {/* 구분선 */}
          {otherPatients.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E0E0E0]" />
              <span className="text-xs text-[#A0A0A0] shrink-0">센터 내 다른 환자</span>
              <div className="flex-1 h-px bg-[#E0E0E0]" />
            </div>
          )}

          {/* ── 센터 내 다른 환자 ──────────────────────────────── */}
          {otherPatients.length > 0 && (
            <section className="space-y-2">
              {otherPatients.map(p => (
                <PatientCard key={p.id} patient={p} labels={labels} t={t} matchingPatientId={matchingPatientId} onSelfAssign={handleSelfAssign} showAssignedBadge />
              ))}
            </section>
          )}

          {/* 페이지네이션 */}
          {(page > 0 || pageInfo?.hasNext) && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button type="button" className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40" disabled={page === 0} onClick={() => setPage(p => Math.max(p - 1, 0))}>
                {t.common.prev_page}
              </button>
              <span className="text-xs text-[#808080]">{t.common.page_label(page + 1)}</span>
              <button type="button" className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40" disabled={!pageInfo?.hasNext} onClick={() => setPage(p => p + 1)}>
                {t.common.next_page}
              </button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

// ─── 환자 카드 컴포넌트 ────────────────────────────────────────────────────────

function PatientCard({
  patient, labels, t, matchingPatientId, onSelfAssign, showAssignedBadge,
}: {
  patient: Patient
  labels: ReturnType<typeof useEnumLabels>
  t: ReturnType<typeof useTranslation>['t']
  matchingPatientId: string | null
  onSelfAssign: (p: Patient) => void
  showAssignedBadge: boolean
}) {
  const flagSrc = getFlagSrc(patient.nationality)
  const assignedToMe = !!patient.assignedToMe
  const assignedElsewhere = !!patient.activeInterpreterName && !assignedToMe

  return (
    <article className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3">
      {/* 프로필 (아바타 or 성별 아이콘) */}
      <div className="relative shrink-0">
        {patient.avatarUrl ? (
          <Image
            src={patient.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <Image
            src={patient.gender === 'FEMALE' ? '/icons/common/gender/small-여성-배경o.svg' : '/icons/common/gender/small-남성-배경o.svg'}
            alt={labels.gender[patient.gender]}
            width={36}
            height={36}
          />
        )}
        {flagSrc && (
          <Image src={flagSrc} alt={labels.nationality[patient.nationality]} width={14} height={14} className="absolute -bottom-0.5 -right-0.5" />
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        {assignedToMe ? (
          <Link href={`/patients/${patient.id}`} className="block">
            <PatientInfo patient={patient} labels={labels} />
          </Link>
        ) : (
          <PatientInfo patient={patient} labels={labels} />
        )}
      </div>

      {/* 담당 배정 버튼 */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {showAssignedBadge && assignedElsewhere && (
          <span className="text-[10px] text-[#A0A0A0] truncate max-w-[72px]">{patient.activeInterpreterName}</span>
        )}
        <button
          type="button"
          className="rounded-xl bg-[#2592FF] px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500 transition-colors"
          disabled={assignedToMe || matchingPatientId === patient.id}
          onClick={() => onSelfAssign(patient)}
        >
          {matchingPatientId === patient.id
            ? t.patient.self_matching
            : assignedToMe
              ? t.patient.self_matched
              : assignedElsewhere
                ? t.patient.self_match_takeover
                : t.patient.self_match}
        </button>
      </div>
    </article>
  )
}

function PatientInfo({ patient, labels }: { patient: Patient; labels: ReturnType<typeof useEnumLabels> }) {
  return (
    <>
      <p className="text-base font-semibold text-[#161616] truncate">{patient.name}</p>
      <p className="text-sm text-[#808080] mt-0.5 truncate">
        {labels.nationality[patient.nationality]} / {labels.gender[patient.gender]}
        {patient.visaType ? ` / ${labels.visa[patient.visaType]}` : ''}
      </p>
      {patient.region && <p className="text-xs text-[#A0A0A0] mt-0.5">{patient.region}</p>}
    </>
  )
}
