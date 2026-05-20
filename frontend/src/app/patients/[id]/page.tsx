'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { adminApi, patientApi, centerApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import type { Patient, Consultation, CenterPatientMemo, Center } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'

function consultDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
}

export default function PatientDetailPage() {
  return (
    <Suspense fallback={<AppShell><Spinner /></AppShell>}>
      <PatientDetailInner />
    </Suspense>
  )
}

function PatientDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightCid = searchParams.get('cid')

  const { t } = useTranslation()
  const labels = useEnumLabels()
  const { data: me } = useMe()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [history, setHistory] = useState<Consultation[]>([])
  const [memos, setMemos] = useState<CenterPatientMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const [publicMemo, setPublicMemo] = useState('')
  const [privateMemo, setPrivateMemo] = useState('')
  const [interpreterVisible, setInterpreterVisible] = useState(true)
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoError, setMemoError] = useState('')

  const [centerPopupOpen, setCenterPopupOpen] = useState(false)
  const [centerSearchQuery, setCenterSearchQuery] = useState('')
  const [allCenters, setAllCenters] = useState<Center[]>([])
  const [centerActionLoading, setCenterActionLoading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setHistoryError('')
      try {
        const pRes = await patientApi.get(id)
        if (cancelled) return
        setPatient(pRes.payload)

        try {
          const hRes = await patientApi.history(id)
          if (!cancelled) setHistory(hRes.payload ?? [])
        } catch (e) {
          if (!cancelled) {
            setHistory([])
            setHistoryError(e instanceof Error ? e.message : t.patient.no_consultation)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, t.patient.no_consultation])

  useEffect(() => {
    if (!me || me.role !== 'interpreter') return
    adminApi.patientMemos(id)
      .then(res => setMemos(res.payload ?? []))
      .catch(() => setMemos([]))
  }, [id, me])

  useEffect(() => {
    if (!centerPopupOpen) return
    centerApi.list(centerSearchQuery || undefined)
      .then(res => setAllCenters(res.payload ?? []))
      .catch(() => setAllCenters([]))
  }, [centerPopupOpen, centerSearchQuery])

  async function handleMemoCreate(e: React.FormEvent) {
    e.preventDefault()
    setMemoSaving(true)
    setMemoError('')
    try {
      await adminApi.createPatientMemo(id, { publicMemo, privateMemo, interpreterVisible })
      setPublicMemo('')
      setPrivateMemo('')
      setInterpreterVisible(true)
      const res = await adminApi.patientMemos(id)
      setMemos(res.payload ?? [])
    } catch (e) {
      setMemoError(e instanceof Error ? e.message : t.patient.err_memo)
    } finally {
      setMemoSaving(false)
    }
  }

  async function handleAddCenter(centerId: string) {
    setCenterActionLoading(centerId)
    try {
      const res = await patientApi.addCenter(id, centerId)
      setPatient(res.payload as Patient)
      setCenterPopupOpen(false)
      setCenterSearchQuery('')
    } catch (e) {
      alert(e instanceof Error ? e.message : t.patient.err_center_add)
    } finally {
      setCenterActionLoading(null)
    }
  }

  async function handleRemoveCenter(centerId: string) {
    if (!confirm(t.patient.confirm_center_remove)) return
    setCenterActionLoading(centerId)
    try {
      const res = await patientApi.removeCenter(id, centerId)
      setPatient(res.payload as Patient)
    } catch (e) {
      alert(e instanceof Error ? e.message : t.patient.err_center_remove)
    } finally {
      setCenterActionLoading(null)
    }
  }

  if (loading) return <AppShell><Spinner /></AppShell>
  if (!patient) return <AppShell><p className="text-center py-10 text-gray-400">{t.patient.not_found}</p></AppShell>

  const highlightedConsultation = highlightCid ? history.find(c => c.id === highlightCid) ?? null : null
  const registeredCenterIds = new Set((patient.centers ?? []).map(c => c.id))
  const filteredCenters = allCenters.filter(c =>
    !centerSearchQuery || c.name.toLowerCase().includes(centerSearchQuery.toLowerCase())
  )
  const isAdmin = false
  const isInterpreter = me?.role === 'interpreter'

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-gray-400 text-xl leading-none w-6">←</button>
        <h1 className="flex-1 text-center text-base font-semibold text-neutral-700">상세 프로필</h1>
        <div className="w-6" />
      </div>

      {/* 진료 배너 */}
      {highlightedConsultation && (
        <div className="bg-green-50 px-10 py-5 flex flex-col gap-2">
          <p className="text-lg font-medium text-lime-600">오늘 진료가 있어요</p>
          <div className="flex flex-col gap-1">
            <p className="text-base text-zinc-600">{consultDateKo(highlightedConsultation.consultationDate)}</p>
            {(highlightedConsultation.hospitalName || highlightedConsultation.department) && (
              <p className="text-base text-zinc-600 w-48">
                {[highlightedConsultation.hospitalName, highlightedConsultation.department].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 - 회색 배경 */}
      <div className="bg-neutral-100 px-4 py-4 pb-10 space-y-3 min-h-screen">

        {/* 기본 정보 카드 */}
        <div className="bg-white rounded-lg px-4 py-6 flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-neutral-900">{patient.name}</h2>
            <div className="flex flex-col gap-4">
              {patient.birthDate && (
                <InfoRow label="생년월일" value={patient.birthDate} />
              )}
              <InfoRow label="성별" value={labels.gender[patient.gender]} />
              <InfoRow label="국적" value={labels.nationality[patient.nationality]} />
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <Link href={`/rm/new?patientId=${id}${highlightCid ? `&cid=${highlightCid}` : ''}`}
              className="flex-1 px-5 py-4 bg-gray-100 rounded-lg flex flex-col items-center gap-2">
              <div className="size-7 flex items-center justify-center">
                <div className="w-4 h-5 border-2 border-blue-500 rounded-sm" />
              </div>
              <span className="text-base font-medium text-neutral-900">RM 작성</span>
            </Link>
            <a
              href={patient.phone ? `tel:${patient.phone}` : undefined}
              onClick={!patient.phone ? e => e.preventDefault() : undefined}
              className={`flex-1 px-5 py-4 bg-gray-100 rounded-lg flex flex-col items-center gap-2 ${!patient.phone ? 'opacity-40' : ''}`}
            >
              <div className="size-7 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 4.5A1 1 0 013.5 3.5h2a1 1 0 01.95.68l1 3a1 1 0 01-.23 1.05L6.27 9.2C7.48 11.66 9.34 13.52 11.8 14.73l.97-.95a1 1 0 011.05-.23l3 1a1 1 0 01.68.95v2a1 1 0 01-1 1A14.5 14.5 0 012.5 4.5z" />
                </svg>
              </div>
              <span className="text-base font-medium text-neutral-900">전화</span>
            </a>
          </div>
        </div>

        {/* 추가 정보 카드 */}
        {(patient.visaType || patient.region || patient.phone) && (
          <div className="bg-white rounded-lg p-4 flex flex-col gap-4">
            {patient.visaType && <InfoRow label="비자" value={labels.visa[patient.visaType]} />}
            {patient.region && <InfoRow label="거주지" value={patient.region} />}
            {patient.phone && <InfoRow label="연락처" value={patient.phone} />}
          </div>
        )}

        {/* 소속 센터 (admin) - 관리자 기능 비활성화 */}
        {false && isAdmin && (
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-start gap-2.5">
              <span className="w-20 text-zinc-700 text-base shrink-0 pt-0.5">{t.patient.affiliation_center}</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {(patient?.centers ?? []).map(center => (
                  <span key={center.id}
                    className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                    {center.name}
                    <button onClick={() => handleRemoveCenter(center.id)}
                      disabled={centerActionLoading === center.id}
                      className="text-blue-400 hover:text-red-500 ml-0.5 font-bold leading-none">
                      {centerActionLoading === center.id ? '…' : '×'}
                    </button>
                  </span>
                ))}
                <button onClick={() => setCenterPopupOpen(true)}
                  className="text-xs text-gray-400 border border-dashed border-gray-300 rounded-full px-2 py-0.5 hover:border-blue-400 hover:text-blue-500">
                  {t.patient.add_center}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 센터 메모 */}
        {isInterpreter && (
          <div className="bg-white rounded-lg p-4 space-y-3">
            <h3 className="text-base font-semibold text-neutral-700">{t.patient.center_memo}</h3>
            <form onSubmit={handleMemoCreate} className="space-y-2">
              <textarea className="input min-h-20 text-sm" value={publicMemo}
                onChange={e => setPublicMemo(e.target.value)}
                placeholder={t.patient.public_memo_placeholder} />
              {memoError && <p className="text-red-500 text-xs">{memoError}</p>}
              <button type="submit" className="btn-secondary w-full text-sm" disabled={memoSaving}>
                {memoSaving ? t.patient.memo_saving : t.patient.memo_save}
              </button>
            </form>
            {memos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">{t.patient.no_memo}</p>
            ) : (
              <div className="space-y-2">
                {memos.map(memo => (
                  <div key={memo.id} className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">{new Date(memo.createdAt).toLocaleString(t.locale)}</span>
                      {memo.interpreterVisible
                        ? <Badge variant="green">{t.patient.badge_interpreter_visible}</Badge>
                        : <Badge variant="yellow">{t.patient.badge_admin_only}</Badge>}
                    </div>
                    {memo.publicMemo && <p className="whitespace-pre-wrap">{memo.publicMemo}</p>}
                    {isAdmin && memo.privateMemo && (
                      <p className="text-xs text-gray-500 whitespace-pre-wrap border-t border-gray-200 pt-1">{memo.privateMemo}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 이전 진료 내역 */}
        <h3 className="text-lg font-medium text-neutral-900 px-0 pt-2">이전 진료 내역</h3>

        {historyError ? (
          <p className="text-sm text-red-500 text-center py-4">{historyError}</p>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-lg px-5 py-8 text-center">
            <p className="text-sm text-gray-400">{t.patient.no_consultation}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(c => (
              <Link key={c.id} href={`/consultations/${c.id}`}
                className="flex justify-between items-center bg-white rounded-lg px-5 py-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
                  <span className="text-base font-semibold text-neutral-900">{consultDateKo(c.consultationDate)}</span>
                  <span className="text-sm text-zinc-500 truncate">
                    {[c.hospitalName, c.department].filter(Boolean).join(' ') || '-'}
                  </span>
                </div>
                {c.confirmed
                  ? <Badge variant="green">{t.common.confirmed}</Badge>
                  : <Badge variant="yellow">{t.common.unconfirmed}</Badge>}
              </Link>
            ))}
          </div>
        )}

        {/* 인수인계 이력 */}
        {/* 인수인계 이력 - 비활성화 */}
        {false && (
          <></>
        )}
      </div>

      {/* 센터 추가 팝업 (admin) - 관리자 기능 비활성화 */}
      {false && centerPopupOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t.patient.center_search_title}</h3>
              <button onClick={() => { setCenterPopupOpen(false); setCenterSearchQuery('') }}
                className="text-gray-400 text-lg leading-none">×</button>
            </div>
            <input className="input" placeholder={t.patient.center_search_placeholder}
              value={centerSearchQuery} onChange={e => setCenterSearchQuery(e.target.value)} autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredCenters.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">{t.common.no_result}</p>
              ) : filteredCenters.map(center => {
                const already = registeredCenterIds.has(center.id)
                return (
                  <button key={center.id} onClick={() => !already && handleAddCenter(center.id)}
                    disabled={already || centerActionLoading === center.id}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                      already ? 'bg-gray-50 text-gray-400 cursor-default' : 'hover:bg-blue-50 hover:text-blue-700'
                    }`}>
                    <span className="font-medium">{center.name}</span>
                    {center.address && <span className="text-xs text-gray-400 ml-1">{center.address}</span>}
                    {already && <span className="text-xs text-green-600 ml-1">{t.patient.already_registered}</span>}
                    {centerActionLoading === center.id && <span className="text-xs ml-1">{t.patient.adding}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-zinc-700 text-lg shrink-0">{label}</span>
      <span className="text-neutral-900 text-lg font-medium">{value}</span>
    </div>
  )
}
