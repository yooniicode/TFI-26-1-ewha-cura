'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { consultationApi, authApi, hospitalApi } from '@/lib/api'
import type {
  AuthMe,
  Consultation,
  ConsultationMethod,
  Hospital,
  IssueType,
  PatientReport,
  ProcessingType,
} from '@/lib/types'
import {
  CONSULTATION_METHODS,
  ISSUE_TYPES,
  PROCESSING_TYPES,
  useEnumLabels,
} from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { formatKoreanDate, formatKoreanDateTime, toDateKey } from '@/lib/dateFormat'

type ReportForm = {
  consultationDate: string
  hospitalId: string
  department: string
  doctorName: string
  issueType: IssueType
  method: '' | ConsultationMethod
  processing: '' | ProcessingType
  patientComment: string
  treatmentResult: string
  diagnosisContent: string
  diagnosisNameCode: string
  medicationInstruction: string
  nextAppointmentDate: string
  counselorName: string
  durationHours: string
  fee: string
  workDescription: string
  doctorConfirmationSignature: string
  memo: string
}

export default function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [data, setData] = useState<Consultation | null>(null)
  const [patientReport, setPatientReport] = useState<PatientReport | null>(null)
  const [me, setMe] = useState<AuthMe | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [form, setForm] = useState<ReportForm | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    authApi.me()
      .then(async meRes => {
        setMe(meRes.payload)
        if (meRes.payload.role === 'patient') {
          const cRes = await consultationApi.getPatientReport(id)
          setPatientReport(cRes.payload)
          return
        }
        const [cRes, hRes] = await Promise.all([
          consultationApi.get(id),
          hospitalApi.search(),
        ])
        setData(cRes.payload)
        setForm(toForm(cRes.payload))
        setHospitals(hRes.payload ?? [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof ReportForm, value: string) => {
    setForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    setError('')
    try {
      const res = await consultationApi.update(id, {
        ...form,
        consultationDate: form.consultationDate || null,
        hospitalId: form.hospitalId || undefined,
        method: form.method || null,
        processing: form.processing || null,
        nextAppointmentDate: form.nextAppointmentDate || null,
        durationHours: form.durationHours ? Number(form.durationHours) : null,
        fee: form.fee ? Number(form.fee) : null,
      })
      setData(res.payload)
      setForm(toForm(res.payload))
      setEditMode(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t.consultation.err_update)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    if (!me || !data) return
    const by = me.name ?? t.dashboard.role_admin
    setConfirming(true)
    try {
      const res = await consultationApi.confirm(id, { confirmedBy: by, confirmedByPhone: '' })
      setData(res.payload)
      setForm(toForm(res.payload))
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <AppShell noPadding>
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }

  if (me?.role === 'patient') {
    if (!patientReport) {
      return (
        <AppShell noPadding>
          <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
            <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
            <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">{t.consultation.patient_report_title}</h1>
            <div className="w-6" />
          </div>
          <p className="text-center text-[#A0A0A0] py-20 text-sm">{t.consultation.not_found}</p>
        </AppShell>
      )
    }
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
          <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">{t.consultation.patient_report_title}</h1>
          <div className="w-6" />
        </div>
        <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
          <div className="bg-white rounded-xl px-4 py-4 space-y-3">
            <ReportRow label={t.consultation.visit_date_label} value={formatKoreanDateTime(patientReport.consultationDate)} />
            <ReportRow label={t.consultation.hospital} value={patientReport.hospitalName} />
            <ReportRow label={t.consultation.department} value={patientReport.department} />
            <ReportRow label={t.consultation.doctor} value={patientReport.doctorName} />
            <ReportRow label={t.consultation.diagnosis_label} value={patientReport.diagnosisNameCode} />
            <ReportBlock label={t.consultation.diagnosis_content} value={patientReport.diagnosisContent} />
            <ReportBlock label={t.consultation.treatment_result} value={patientReport.treatmentResult} />
            <ReportBlock label={t.consultation.medication} value={patientReport.medicationInstruction} />
            <ReportRow label={t.consultation.next_appointment_date} value={formatKoreanDateTime(patientReport.nextAppointmentDate)} />
            <ReportBlock label={t.consultation.interpreter_comment} value={patientReport.patientComment} />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!data || !form) {
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
          <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">{t.consultation.detail_title}</h1>
          <div className="w-6" />
        </div>
        <p className="text-center text-[#A0A0A0] py-20 text-sm">{t.consultation.not_found}</p>
      </AppShell>
    )
  }

  const patientRows: [string, string | undefined | null][] = [
    [t.consultation.patient_name, data.patientName],
    [t.consultation.patient_birth, data.patientBirthDate],
    [t.consultation.patient_nationality, data.patientNationality ? labels.nationality[data.patientNationality] : null],
    [t.consultation.patient_gender, data.patientGender ? labels.gender[data.patientGender] : null],
    [t.consultation.patient_visa, data.patientVisaType ? labels.visa[data.patientVisaType] : null],
    [t.consultation.patient_region, data.patientRegion],
    [t.consultation.patient_phone, data.patientPhone],
  ]

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#808080] text-xl leading-none w-6">←</button>
        <h1 className="flex-1 text-center text-base font-semibold text-[#424242]">{t.consultation.detail_title}</h1>
        {data.confirmed && <Badge variant="green">{t.common.confirmed}</Badge>}
      </div>

      {/* 내용 */}
      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-3">
        {/* 작성 정보 */}
        <div className="bg-white rounded-xl px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">{t.consultation.written_info}</p>
          <ReportRow label={t.consultation.first_author} value={data.createdByName ?? data.interpreterName} />
          <ReportRow label={t.consultation.created_at} value={formatKoreanDateTime(data.createdAt)} />
          <ReportRow label={t.consultation.updated_at} value={formatKoreanDateTime(data.updatedAt)} />
        </div>

        {editMode ? (
          <EditForm
            form={form}
            hospitals={hospitals}
            error={error}
            saving={saving}
            set={set}
            onSave={handleSave}
            onCancel={() => {
              setForm(toForm(data))
              setEditMode(false)
              setError('')
            }}
          />
        ) : (
          <>
            {/* 환자 정보 */}
            <div className="bg-white rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">{t.consultation.patient_section}</p>
              {patientRows.filter(([, v]) => v).map(([label, value]) => (
                <ReportRow key={label} label={label} value={value} />
              ))}
            </div>

            {/* 진료 기록 */}
            <div className="bg-white rounded-xl px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-1">{t.consultation.work_log_section}</p>
              <ReportRow label={t.consultation.visit_date_label} value={formatKoreanDateTime(data.consultationDate)} />
              <ReportRow label={t.consultation.visit_hospital} value={data.hospitalName} />
              <ReportRow label={t.consultation.department} value={data.department} />
              <ReportRow label={t.consultation.doctor} value={data.doctorName} />
              <ReportRow label={t.consultation.issue_type} value={labels.issue[data.issueType]} />
              <ReportRow label={t.consultation.diagnosis_label} value={data.diagnosisNameCode} />
              <ReportRow label={t.consultation.interp_method} value={data.method ? labels.method[data.method] : null} />
              <ReportRow label={t.consultation.processing} value={data.processing ? labels.processing[data.processing] : null} />
              <ReportRow label={t.consultation.counselor} value={data.counselorName} />
              <ReportRow label={t.consultation.interp_time} value={data.durationHours ? `${data.durationHours}h` : null} />
              <ReportRow label={t.consultation.fee} value={data.fee ? `${data.fee.toLocaleString()}원` : null} />
              <ReportRow label={t.consultation.next_appointment_date} value={formatKoreanDateTime(data.nextAppointmentDate)} />
              <ReportRow label={t.consultation.confirm_by} value={data.confirmedBy} />
              <ReportRow label={t.consultation.confirm_date} value={formatKoreanDate(data.confirmedAt)} />
              <ReportBlock label={t.consultation.diagnosis_content} value={data.diagnosisContent} />
              <ReportBlock label={t.consultation.treatment_result} value={data.treatmentResult} />
              <ReportBlock label={t.consultation.medication} value={data.medicationInstruction} />
              <ReportBlock label={t.consultation.interpreter_comment} value={data.patientComment} />
              <ReportBlock label={t.consultation.work_description} value={data.workDescription} />
              <ReportBlock label={t.consultation.memo} value={data.memo} />
              <ReportBlock label={t.consultation.doctor_signature} value={data.doctorConfirmationSignature} />
            </div>

            {/* Admin report edit/confirm actions disabled.
            {me?.role === 'admin' && (
              <div className="space-y-2">
                <button type="button" onClick={() => setEditMode(true)} className="btn-secondary w-full">
                  {t.consultation.edit_report}
                </button>
                {!data.confirmed && (
                  <button onClick={handleConfirm} disabled={confirming} className="btn-primary w-full">
                    {confirming ? t.consultation.confirming : t.consultation.confirm_report}
                  </button>
                )}
              </div>
            )}
            */}
          </>
        )}
      </div>
    </AppShell>
  )
}

function EditForm({
  form, hospitals, error, saving, set, onSave, onCancel,
}: {
  form: ReportForm
  hospitals: Hospital[]
  error: string
  saving: boolean
  set: (key: keyof ReportForm, value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const labels = useEnumLabels()

  return (
    <div className="bg-white rounded-xl px-4 py-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.visit_date_label}</label>
          <input type="datetime-local" className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.consultationDate} onChange={e => set('consultationDate', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.issue_type}</label>
          <select className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.issueType} onChange={e => set('issueType', e.target.value)}>
            {ISSUE_TYPES.map(value => (
              <option key={value} value={value}>{labels.issue[value]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.hospital}</label>
        <select className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.hospitalId} onChange={e => set('hospitalId', e.target.value)}>
          <option value="">{t.consultation.select_placeholder}</option>
          {hospitals.map(hospital => (
            <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TextInput label={t.consultation.department} value={form.department} onChange={v => set('department', v)} />
        <TextInput label={t.consultation.doctor} value={form.doctorName} onChange={v => set('doctorName', v)} />
      </div>

      <TextInput label={t.consultation.diagnosis_name_code} value={form.diagnosisNameCode} onChange={v => set('diagnosisNameCode', v)} />
      <FieldTextArea label={t.consultation.diagnosis_content} value={form.diagnosisContent} onChange={v => set('diagnosisContent', v)} />
      <FieldTextArea label={t.consultation.treatment_result} value={form.treatmentResult} onChange={v => set('treatmentResult', v)} />
      <FieldTextArea label={t.consultation.medication} value={form.medicationInstruction} onChange={v => set('medicationInstruction', v)} />

      <div>
        <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.next_appointment_date}</label>
        <input type="date" className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.nextAppointmentDate} onChange={e => set('nextAppointmentDate', e.target.value)} />
      </div>

      <FieldTextArea label={t.consultation.interpreter_comment} value={form.patientComment} onChange={v => set('patientComment', v)} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.interp_method}</label>
          <select className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.method} onChange={e => set('method', e.target.value)}>
            <option value="">{t.consultation.select_placeholder}</option>
            {CONSULTATION_METHODS.map(value => (
              <option key={value} value={value}>{labels.method[value]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.processing}</label>
          <select className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={form.processing} onChange={e => set('processing', e.target.value)}>
            <option value="">{t.consultation.select_placeholder}</option>
            {PROCESSING_TYPES.map(value => (
              <option key={value} value={value}>{labels.processing[value]}</option>
            ))}
          </select>
        </div>
      </div>

      <TextInput label={t.consultation.counselor} value={form.counselorName} onChange={v => set('counselorName', v)} />
      <div className="grid grid-cols-2 gap-2">
        <TextInput label={t.consultation.interp_time} value={form.durationHours} onChange={v => set('durationHours', v)} type="number" />
        <TextInput label={t.consultation.fee} value={form.fee} onChange={v => set('fee', v)} type="number" />
      </div>
      <FieldTextArea label={t.consultation.work_description} value={form.workDescription} onChange={v => set('workDescription', v)} />
      <FieldTextArea label={t.consultation.memo} value={form.memo} onChange={v => set('memo', v)} />
      <FieldTextArea label={t.consultation.doctor_signature} value={form.doctorConfirmationSignature} onChange={v => set('doctorConfirmationSignature', v)} />

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="h-11 rounded-lg bg-[#F0F1F5] text-sm font-medium text-[#494949]" onClick={onCancel} disabled={saving}>{t.consultation.cancel_edit}</button>
        <button type="button" className="h-11 rounded-lg bg-[#2592FF] text-sm font-semibold text-white disabled:opacity-60" onClick={onSave} disabled={saving}>
          {saving ? t.consultation.saving : t.consultation.save_edit}
        </button>
      </div>
    </div>
  )
}

function TextInput({
  label, value, onChange, type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[#161616] block mb-1">{label}</label>
      <input type={type} className="w-full bg-[#F5F5F5] rounded-lg px-3 py-2.5 text-base outline-none text-[#161616]" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FieldTextArea({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[#161616] block mb-1">{label}</label>
      <textarea className="w-full bg-[#F5F5F5] rounded-lg px-3 py-3 text-base outline-none text-[#161616] min-h-24 resize-none" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-xs text-[#808080] w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-[#161616]">{value}</span>
    </div>
  )
}

function ReportBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="pt-1">
      <p className="text-xs text-[#808080] mb-1">{label}</p>
      <p className="text-sm text-[#161616] whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function toForm(data: Consultation): ReportForm {
  return {
    consultationDate: data.consultationDate ? data.consultationDate.slice(0, 16) : '',
    hospitalId: data.hospitalId ?? '',
    department: data.department ?? '',
    doctorName: data.doctorName ?? '',
    issueType: data.issueType,
    method: data.method ?? '',
    processing: data.processing ?? '',
    patientComment: data.patientComment ?? '',
    treatmentResult: data.treatmentResult ?? '',
    diagnosisContent: data.diagnosisContent ?? '',
    diagnosisNameCode: data.diagnosisNameCode ?? '',
    medicationInstruction: data.medicationInstruction ?? '',
    nextAppointmentDate: toDateKey(data.nextAppointmentDate),
    counselorName: data.counselorName ?? '',
    durationHours: data.durationHours ? String(data.durationHours) : '',
    fee: data.fee ? String(data.fee) : '',
    workDescription: data.workDescription ?? '',
    doctorConfirmationSignature: data.doctorConfirmationSignature ?? '',
    memo: data.memo ?? '',
  }
}

