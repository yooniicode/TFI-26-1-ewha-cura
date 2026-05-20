'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Spinner from '@/components/ui/Spinner'
import { scriptApi, patientApi, consultationApi } from '@/lib/api'
import type { MedicalScript, Patient, Consultation, ScriptType } from '@/lib/types'
import { SCRIPT_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function ScriptGeneratePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [scripts, setScripts] = useState<MedicalScript[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    scriptType: 'GENERAL' as ScriptType,
    consultationId: '',
    additionalContext: '',
  })
  const [error, setError] = useState('')

  const loadScripts = useCallback(
    () => scriptApi.byPatient(patientId).then(r => setScripts(r.payload ?? [])),
    [patientId],
  )

  useEffect(() => {
    Promise.all([
      patientApi.get(patientId),
      consultationApi.byPatient(patientId),
      loadScripts(),
    ]).then(([pRes, cRes]) => {
      setPatient(pRes.payload)
      setConsultations(cRes.payload ?? [])
    }).finally(() => setLoading(false))
  }, [patientId, loadScripts])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    try {
      await scriptApi.generate({
        patientId,
        consultationId: form.consultationId || null,
        scriptType: form.scriptType,
        additionalContext: form.additionalContext || null,
      })
      await loadScripts()
      setForm(f => ({ ...f, additionalContext: '' }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
          <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">{t.script.title}</h1>
          <div className="w-6" />
        </div>
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">
          {t.script.title}{patient && ` — ${patient.name}`}
        </h1>
        <div className="w-6" />
      </div>

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-3">
        {/* 생성 폼 */}
        <form onSubmit={handleGenerate} className="bg-white rounded-xl px-4 py-4 space-y-4">
          <p className="text-sm font-semibold text-[#161616]">{t.script.form_title}</p>
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.script.script_type}</label>
            <select
              className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616]"
              value={form.scriptType}
              onChange={e => setForm(f => ({ ...f, scriptType: e.target.value as ScriptType }))}
            >
              {SCRIPT_TYPES.map(value => (
                <option key={value} value={value}>{labels.script[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.script.ref_consultation}</label>
            <select
              className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616]"
              value={form.consultationId}
              onChange={e => setForm(f => ({ ...f, consultationId: e.target.value }))}
            >
              <option value="">{t.script.ref_auto}</option>
              {consultations.map(c => (
                <option key={c.id} value={c.id}>
                  {c.consultationDate} — {c.hospitalName ?? t.script.no_hospital}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.script.additional_context}</label>
            <textarea
              className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] resize-none min-h-[60px] placeholder:text-[#A0A0A0]"
              placeholder={t.script.additional_placeholder}
              value={form.additionalContext}
              onChange={e => setForm(f => ({ ...f, additionalContext: e.target.value }))}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-[#2592FF] text-sm font-semibold text-white disabled:opacity-60"
            disabled={generating}
          >
            {generating ? t.script.generating : t.script.generate_btn}
          </button>
        </form>

        {/* 저장된 스크립트 목록 */}
        <div>
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-2">
            {t.script.saved_scripts} ({scripts.length})
          </p>
          {scripts.length === 0 ? (
            <p className="text-sm text-[#A0A0A0] text-center py-6">{t.script.no_scripts}</p>
          ) : (
            <div className="space-y-3">
              {scripts.map(s => (
                <div key={s.id} className="bg-white rounded-xl px-4 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#2592FF]">
                      {labels.script[s.scriptType]}
                    </span>
                    <span className="text-xs text-[#A0A0A0]">
                      {new Date(s.createdAt).toLocaleDateString(t.locale)}
                    </span>
                  </div>
                  <p className="text-sm text-[#494949] line-clamp-3">{s.contentKo}</p>
                  <Link
                    href={`/scripts/${s.id}/present`}
                    className="mt-3 block text-center py-2.5 rounded-lg bg-[#EAF4FF] text-[#2592FF] text-sm font-semibold"
                  >
                    {t.script.present_mode}
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
