'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { matchApi, patientApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import type { Gender, Nationality, PageInfo, Patient, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'

interface CreatePatientForm {
  name: string
  nationality: Nationality
  gender: Gender
  visaType: VisaType
  birthDate: string
  phone: string
  region: string
  visaNote: string
}

const initialForm: CreatePatientForm = {
  name: '',
  nationality: 'OTHER',
  gender: 'OTHER',
  visaType: 'OTHER',
  birthDate: '',
  phone: '',
  region: '',
  visaNote: '',
}

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
  const [form, setForm] = useState<CreatePatientForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [matchError, setMatchError] = useState('')
  const [matchingPatientId, setMatchingPatientId] = useState<string | null>(null)
  const [copiedPatientId, setCopiedPatientId] = useState<string | null>(null)
  const canLoadPatients = me?.role === 'interpreter'

  useEffect(() => {
    if (!canLoadPatients) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError('')
    patientApi.list(page, submittedQuery)
      .then(r => {
        if (!cancelled) {
          setItems(r.payload ?? [])
          setPageInfo(r.pageInfo)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setItems([])
          setPageInfo(undefined)
          setListError(e instanceof Error ? e.message : t.patient.empty)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [canLoadPatients, me?.authUserId, page, submittedQuery, t.patient.empty])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t.patient.err_name); return }
    setSaving(true)
    setError('')
    try {
      await patientApi.create({
        name: form.name.trim(),
        nationality: form.nationality,
        gender: form.gender,
        visaType: form.visaType,
        birthDate: form.birthDate || undefined,
        phone: form.phone.trim() || undefined,
        region: form.region.trim() || undefined,
        visaNote: form.visaNote.trim() || undefined,
      })
      setForm(initialForm)
      setPage(0)
      setSubmittedQuery(query.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : t.patient.err_register)
    } finally {
      setSaving(false)
    }
  }

  async function copySignupGuide(patient: Patient) {
    const message = t.patient.invite_message(patient.name, patient.phone)
    await navigator.clipboard.writeText(message)
    setCopiedPatientId(patient.id)
    window.setTimeout(() => setCopiedPatientId(current => current === patient.id ? null : current), 2000)
  }

  async function handleSelfAssign(patient: Patient) {
    setMatchingPatientId(patient.id)
    setMatchError('')
    try {
      const res = await matchApi.selfAssign(patient.id)
      const match = res.payload
      setItems(current => current.map(item => item.id === patient.id
        ? {
            ...item,
            assignedToMe: true,
            activeInterpreterId: match.interpreterId,
            activeInterpreterName: match.interpreterName,
          }
        : item.activeInterpreterId === match.interpreterId
          ? item
          : item))
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : t.patient.err_self_match)
    } finally {
      setMatchingPatientId(null)
    }
  }

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
        <h1 className="text-base font-semibold text-[#424242]">{t.patient.list_title}</h1>
      </div>

      {/* 검색 */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-[#EEEEEE]">
        {me?.role === 'interpreter' && (
          <p className="text-xs text-[#808080] mb-2">{t.patient.interpreter_search_note}</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPage(0)
            setSubmittedQuery(query.trim())
          }}
          className="flex gap-2"
        >
          <input
            className="flex-1 bg-[#F5F5F5] rounded-lg px-4 py-2.5 text-base outline-none placeholder:text-[#A0A0A0] text-[#161616]"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.patient.search_placeholder}
          />
          <button
            type="submit"
            className="bg-[#2592FF] text-white text-sm font-semibold px-4 py-2.5 rounded-lg shrink-0"
          >
            {t.common.search}
          </button>
        </form>
        {matchError && <p className="mt-2 text-xs text-red-500">{matchError}</p>}
      </div>

      {/* Admin patient creation disabled */}
      {false && me?.role === 'admin' && (
        <form onSubmit={handleCreate} className="bg-white px-4 py-4 border-b border-[#EEEEEE] space-y-3">
          <div>
            <label className="label">{t.patient.name}</label>
            <input className="input" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">{t.patient.nationality}</label>
              <select className="input" value={form.nationality} onChange={e => setForm(prev => ({ ...prev, nationality: e.target.value as Nationality }))}>
                {NATIONALITIES.map(value => <option key={value} value={value}>{labels.nationality[value]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t.patient.gender}</label>
              <select className="input" value={form.gender} onChange={e => setForm(prev => ({ ...prev, gender: e.target.value as Gender }))}>
                {GENDERS.map(value => <option key={value} value={value}>{labels.gender[value]}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary" onClick={() => {}}>
              {t.common.cancel}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      )}

      {/* 목록 */}
      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
        {meLoading || loading ? (
          <Spinner />
        ) : listError ? (
          <EmptyState message={listError} />
        ) : items.length === 0 ? (
          <EmptyState
            message={me?.role === 'interpreter' ? t.patient.empty_interpreter : t.patient.empty}
          />
        ) : (
          <div className="space-y-3">
            {items.map(p => {
              const assignedToMe = !!p.assignedToMe
              const assignedElsewhere = !!p.activeInterpreterName && !assignedToMe
              const content = (
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-[#161616] truncate">{p.name}</p>
                  <p className="text-sm text-[#808080] mt-0.5">
                    {labels.nationality[p.nationality]} / {labels.gender[p.gender]} / {labels.visa[p.visaType]}
                  </p>
                  {p.region && <p className="text-xs text-[#A0A0A0] mt-0.5">{p.region}</p>}
                </div>
              )

              return (
                <article
                  key={p.id}
                  className="bg-white rounded-xl px-4 py-4 flex items-center justify-between gap-3"
                >
                  {assignedToMe ? (
                    <Link href={`/patients/${p.id}`} className="min-w-0 flex-1">
                      {content}
                    </Link>
                  ) : content}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={assignedToMe ? 'green' : assignedElsewhere ? 'yellow' : p.accountLinked ? 'green' : 'yellow'}>
                      {assignedToMe
                        ? t.patient.self_matched
                        : assignedElsewhere
                          ? t.patient.assigned_to(p.activeInterpreterName!)
                          : p.accountLinked ? t.patient.account_linked : t.patient.account_unlinked}
                    </Badge>
                    {me?.role === 'interpreter' && (
                      <button
                        type="button"
                        className="rounded-lg bg-[#2592FF] px-3 py-1.5 text-xs font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500"
                        disabled={assignedToMe || matchingPatientId === p.id}
                        onClick={() => handleSelfAssign(p)}
                      >
                        {matchingPatientId === p.id
                          ? t.patient.self_matching
                          : assignedToMe
                            ? t.patient.self_matched
                            : assignedElsewhere
                              ? t.patient.self_match_takeover
                              : t.patient.self_match}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}

            {(page > 0 || pageInfo?.hasNext) && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40"
                  disabled={page === 0}
                  onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                >
                  {t.common.prev_page}
                </button>
                <span className="text-xs text-[#808080]">{t.common.page_label(page + 1)}</span>
                <button
                  type="button"
                  className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40"
                  disabled={!pageInfo?.hasNext}
                  onClick={() => setPage(prev => prev + 1)}
                >
                  {t.common.next_page}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
