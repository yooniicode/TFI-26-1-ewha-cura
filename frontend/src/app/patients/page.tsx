'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { patientApi } from '@/lib/api'
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
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreatePatientForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
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
      setShowCreate(false)
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

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{t.patient.list_title}</h1>
            {me?.role === 'interpreter' && (
              <p className="text-xs text-gray-500 mt-1">{t.patient.interpreter_search_note}</p>
            )}
          </div>
          {/* Admin patient creation disabled. */}
          {false && me?.role === 'admin' && (
            <button
              type="button"
              className="btn-primary text-sm shrink-0"
              onClick={() => setShowCreate(prev => !prev)}
            >
              {t.patient.register}
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            setPage(0)
            setSubmittedQuery(query.trim())
          }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.patient.search_placeholder}
          />
          <button type="submit" className="btn-secondary shrink-0">{t.common.search}</button>
        </form>

        {false && showCreate && me?.role === 'admin' && (
          <form onSubmit={handleCreate} className="card space-y-3">
            <div>
              <label className="label">{t.patient.name}</label>
              <input
                className="input"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="label">{t.patient.nationality}</label>
                <select
                  className="input"
                  value={form.nationality}
                  onChange={e => setForm(prev => ({ ...prev, nationality: e.target.value as Nationality }))}
                >
                  {NATIONALITIES.map(value => <option key={value} value={value}>{labels.nationality[value]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.patient.gender}</label>
                <select
                  className="input"
                  value={form.gender}
                  onChange={e => setForm(prev => ({ ...prev, gender: e.target.value as Gender }))}
                >
                  {GENDERS.map(value => <option key={value} value={value}>{labels.gender[value]}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="label">{t.patient.visa}</label>
                <select
                  className="input"
                  value={form.visaType}
                  onChange={e => setForm(prev => ({ ...prev, visaType: e.target.value as VisaType }))}
                >
                  {VISA_TYPES.map(value => <option key={value} value={value}>{labels.visa[value]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.patient.birth_date}</label>
                <input
                  type="date"
                  className="input"
                  value={form.birthDate}
                  onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">{t.patient.phone}</label>
              <input
                className="input"
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="label">{t.patient.region}</label>
              <input
                className="input"
                value={form.region}
                onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t.patient.visa_note}</label>
              <textarea
                className="input min-h-20"
                value={form.visaNote}
                onChange={e => setForm(prev => ({ ...prev, visaNote: e.target.value }))}
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                {t.common.cancel}
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t.common.saving : t.common.save}
              </button>
            </div>
          </form>
        )}

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
            <div className="space-y-2">
              {items.map(p => (
                <div key={p.id} className="card space-y-3">
                  <Link href={`/patients/${p.id}`} className="block hover:text-primary-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {labels.nationality[p.nationality]} / {labels.gender[p.gender]} / {labels.visa[p.visaType]}
                        </p>
                        {p.region && <p className="text-xs text-gray-400">{p.region}</p>}
                      </div>
                      <Badge variant={p.accountLinked ? 'green' : 'yellow'}>
                        {p.accountLinked ? t.patient.account_linked : t.patient.account_unlinked}
                      </Badge>
                    </div>
                  </Link>
                  {false && me?.role === 'admin' && !p.accountLinked && (
                    <button
                      type="button"
                      className="btn-secondary w-full py-1.5 text-sm"
                      onClick={() => copySignupGuide(p)}
                    >
                      {copiedPatientId === p.id ? t.patient.invite_copied : t.patient.invite_signup}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(page > 0 || pageInfo?.hasNext) && (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-sm"
                  disabled={page === 0}
                  onClick={() => setPage(prev => Math.max(prev - 1, 0))}
                >
                  {t.common.prev_page}
                </button>
                <span className="text-xs text-gray-500">{t.common.page_label(page + 1)}</span>
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-sm"
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
