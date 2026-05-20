'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import { adminApi, centerApi, patientApi, interpreterApi, authApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { createClient } from '@/lib/supabase'
import { useMe } from '@/hooks/useMe'
import type { Center, Patient, Interpreter, VisaType } from '@/lib/types'
import { VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import Spinner from '@/components/ui/Spinner'
import PasswordInput from '@/components/ui/PasswordInput'
import { INTERPRETER_LANGUAGE_OPTIONS } from '@/lib/constants'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'

export default function MyPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { data: me, isLoading: meLoading } = useMe()
  const labels = useEnumLabels()

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: queryKeys.patients.detail(me?.entityId ?? ''),
    queryFn: () => patientApi.get(me!.entityId!).then(r => r.payload as Patient),
    enabled: me?.role === 'patient' && !!me?.entityId,
  })

  const { data: interpreter, isLoading: interpreterLoading } = useQuery({
    queryKey: queryKeys.interpreters.detail(me?.entityId ?? ''),
    queryFn: () => interpreterApi.get(me!.entityId!).then(r => r.payload as Interpreter),
    enabled: me?.role === 'interpreter' && !!me?.entityId,
  })

  const { data: adminProfile, isLoading: adminProfileLoading } = useQuery({
    queryKey: queryKeys.adminProfile,
    queryFn: () => adminApi.profile().then(r => r.payload),
    enabled: false,
  })

  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: queryKeys.centers,
    queryFn: () => centerApi.list().then(r => r.payload ?? []),
    enabled: false,
  })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')
  const [visaNote, setVisaNote] = useState('')
  const [intPhone, setIntPhone] = useState('')
  const [interpreterLanguages, setInterpreterLanguages] = useState<string[]>([])
  const [availabilityNote, setAvailabilityNote] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [centerAddress, setCenterAddress] = useState('')
  const [centerPhone, setCenterPhone] = useState('')
  const [nickname, setNickname] = useState('')
  const [patientCenterId, setPatientCenterId] = useState('')
  const [patientCenterName, setPatientCenterName] = useState('')

  useEffect(() => {
    if (patient) {
      setName(patient.name ?? '')
      setPhone(patient.phone ?? '')
      setRegion(patient.region ?? '')
      setVisaType(patient.visaType)
      setVisaNote(patient.visaNote ?? '')
    }
  }, [patient])

  useEffect(() => {
    if (interpreter) {
      setName(interpreter.name ?? '')
      setIntPhone(interpreter.phone ?? '')
      setInterpreterLanguages(interpreter.languages ?? [])
      setAvailabilityNote(interpreter.availabilityNote ?? '')
    }
  }, [interpreter])

  useEffect(() => {
    if (adminProfile) {
      setCenterId(adminProfile.centerId ?? '')
      setCenterName(adminProfile.centerName ?? '')
      setNickname(adminProfile.nickname ?? '')
    }
  }, [adminProfile])

  useEffect(() => {
    const selected = centers.find(center => center.id === centerId)
    if (!selected) return
    setCenterName(selected.name)
    setCenterAddress(selected.address ?? '')
    setCenterPhone(selected.phone ?? '')
  }, [centerId, centers])

  const { mutate: save, isPending: saving, isSuccess, error: saveError } = useMutation<unknown, Error>({
    mutationFn: () => {
      if (!me?.entityId) return Promise.reject(new Error(t.mypage.err_profile))
      if (me.role === 'patient') {
        return patientApi.update(me.entityId, { name: name.trim(), phone, region, visaType, visaNote })
      }
      return interpreterApi.update(me.entityId, {
        name: name.trim(),
        phone: intPhone,
        languages: interpreterLanguages,
        availabilityNote: availabilityNote.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(me?.entityId ?? '') })
      queryClient.invalidateQueries({ queryKey: queryKeys.interpreters.detail(me?.entityId ?? '') })
    },
  })

  const { mutate: saveAdminProfile, isPending: savingAdminProfile, isSuccess: adminSaved, error: adminSaveError } =
    useMutation<unknown, Error>({
      mutationFn: () => adminApi.updateProfile({
        centerId: centerId || undefined,
        centerName: centerId ? undefined : centerName,
        nickname,
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.adminProfile })
        queryClient.invalidateQueries({ queryKey: queryKeys.me })
      },
    })

  const { mutate: addPatientCenter, isPending: addingPatientCenter, error: patientCenterError } =
    useMutation<Patient, Error>({
      mutationFn: () => {
        if (!patientCenterId) return Promise.reject(new Error(t.patient.err_center_add))
        return patientApi.addMyCenter(patientCenterId).then(r => r.payload as Patient)
      },
      onSuccess: (updatedPatient) => {
        setPatientCenterId('')
        setPatientCenterName('')
        queryClient.setQueryData(queryKeys.patients.detail(updatedPatient.id), updatedPatient)
        queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(me?.entityId ?? '') })
        queryClient.invalidateQueries({ queryKey: queryKeys.me })
      },
    })

  const { mutate: saveCenterInfo, isPending: savingCenterInfo, error: centerSaveError } =
    useMutation<Center, Error>({
      mutationFn: () => {
        if (!centerName.trim()) return Promise.reject(new Error(t.mypage.err_center_name))
        const body = {
          name: centerName.trim(),
          address: centerAddress.trim() || undefined,
          phone: centerPhone.trim() || undefined,
          active: true,
        }
        return centerId
          ? centerApi.update(centerId, body).then(r => r.payload as Center)
          : centerApi.create(body).then(r => r.payload as Center)
      },
      onSuccess: (center) => {
        setCenterId(center.id)
        queryClient.invalidateQueries({ queryKey: queryKeys.centers })
      },
    })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (newPassword.length < 8) { setPwError(t.mypage.err_password_min); return }
    if (newPassword !== confirmPassword) { setPwError(t.mypage.err_password_confirm); return }
    setPwSaving(true)
    const { error } = await createClient().auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwError(error.message); return }
    setPwSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
  }

  async function handleDeleteAccount() {
    if (!confirm(t.mypage.delete_confirm)) return
    try {
      await authApi.deleteAccount()
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (e) {
      console.error(e)
      alert(t.mypage.delete_error)
    }
  }

  async function handleLogout() {
    await createClient().auth.signOut()
    window.location.href = '/login'
  }

  const loading = meLoading || patientLoading || interpreterLoading || adminProfileLoading || centersLoading
  if (loading) {
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
          <h1 className="text-base font-semibold text-[#424242]">{t.mypage.title}</h1>
        </div>
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }
  if (!meLoading && me && me.role !== 'admin' && !me.entityId) {
    window.location.replace('/auth/complete')
    return null
  }

  const roleLabel = me?.role === 'admin' ? t.mypage.role_admin : me?.role === 'interpreter' ? t.mypage.role_interpreter : t.mypage.role_patient

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
        <h1 className="text-base font-semibold text-[#424242]">{t.mypage.title}</h1>
        <p className="text-xs text-[#808080] mt-0.5">{roleLabel} · {me?.name}</p>
      </div>

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-3">
        {/* 프로필 정보 */}
        {me?.role !== 'admin' && (
          <div className="bg-white rounded-xl px-4 py-4">
            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">프로필 정보</p>
            <form onSubmit={e => { e.preventDefault(); save() }} className="space-y-4">
              <Field label={t.mypage.name_label} hint={t.mypage.name_hint}>
                <input
                  className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] placeholder:text-[#A0A0A0]"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.mypage.name_placeholder}
                  required
                />
              </Field>

              {me?.role === 'patient' && (
                <>
                  <Field label={t.mypage.phone}>
                    <input className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] placeholder:text-[#A0A0A0]" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
                  </Field>
                  <Field label={t.mypage.region}>
                    <input className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616]" value={region} onChange={e => setRegion(e.target.value)} />
                  </Field>
                  <Field label={t.mypage.visa_type}>
                    <select className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616]" value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                      {VISA_TYPES.map(value => (
                        <option key={value} value={value}>{labels.visa[value]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.mypage.visa_note}>
                    <input className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616]" value={visaNote} onChange={e => setVisaNote(e.target.value)} />
                  </Field>
                </>
              )}

              {me?.role === 'interpreter' && (
                <>
                  <Field label={t.mypage.phone}>
                    <input className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] placeholder:text-[#A0A0A0]" value={intPhone} onChange={e => setIntPhone(e.target.value)} placeholder="010-0000-0000" />
                    <p className="text-xs text-[#808080] mt-1">{t.mypage.interpreter_role_note}</p>
                  </Field>
                  <Field label={t.mypage.languages}>
                    <div className="grid grid-cols-2 gap-2">
                      {INTERPRETER_LANGUAGE_OPTIONS.map(language => {
                        const selected = interpreterLanguages.includes(language)
                        return (
                          <button
                            key={language}
                            type="button"
                            onClick={() => {
                              setInterpreterLanguages(prev => selected
                                ? prev.filter(item => item !== language)
                                : [...prev, language])
                            }}
                            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                              selected
                                ? 'border-[#2592FF] bg-[#EAF4FF] text-[#2592FF]'
                                : 'border-[#EEEEEE] text-[#494949] bg-[#F5F5F5]'
                            }`}
                          >
                            {language}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label={t.mypage.availability}>
                    <textarea
                      className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] min-h-20 resize-none placeholder:text-[#A0A0A0]"
                      value={availabilityNote}
                      onChange={e => setAvailabilityNote(e.target.value)}
                      placeholder={t.mypage.availability_placeholder}
                    />
                  </Field>
                </>
              )}

              {saveError && <p className="text-red-500 text-xs">{saveError.message}</p>}
              {isSuccess && <p className="text-[#2592FF] text-xs">{t.mypage.save_success}</p>}
              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-[#2592FF] text-sm font-semibold text-white disabled:opacity-60"
                disabled={saving}
              >
                {saving ? t.mypage.saving : t.common.save}
              </button>
            </form>
          </div>
        )}

        {/* 소속 센터 (환자) */}
        {me?.role === 'patient' && (
          <div className="bg-white rounded-xl px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide">{t.patient.affiliation_center}</p>
            <div className="space-y-1">
              {(patient?.centers ?? []).length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">{t.patient.no_center}</p>
              ) : (
                patient?.centers.map(center => (
                  <p key={center.id} className="rounded-lg bg-[#F5F5F5] px-3 py-2.5 text-sm text-[#494949]">
                    {center.name}
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#161616] mb-2">{t.patient.add_center}</p>
              <CenterSearchSelect
                valueName={patientCenterName}
                placeholder={t.patient.center_search_placeholder}
                onSelect={(center) => {
                  setPatientCenterId(center.id)
                  setPatientCenterName(center.name)
                }}
              />
            </div>
            {patientCenterError && <p className="text-red-500 text-xs">{patientCenterError.message}</p>}
            <button
              type="button"
              className="w-full h-11 rounded-lg bg-[#F0F1F5] text-sm font-medium text-[#494949] disabled:opacity-40"
              disabled={!patientCenterId || addingPatientCenter || (patient?.centers ?? []).some(center => center.id === patientCenterId)}
              onClick={() => addPatientCenter()}
            >
              {(patient?.centers ?? []).some(center => center.id === patientCenterId)
                ? t.patient.already_registered
                : addingPatientCenter
                  ? t.patient.adding
                  : t.patient.add_center}
            </button>
          </div>
        )}

        {/* 비밀번호 변경 */}
        <div className="bg-white rounded-xl px-4 py-4">
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">{t.mypage.password_change}</p>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Field label={t.mypage.new_password}>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t.mypage.password_min_hint}
                autoComplete="new-password"
                className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] placeholder:text-[#A0A0A0]"
              />
            </Field>
            <Field label={t.mypage.password_confirm}>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t.mypage.password_reenter}
                autoComplete="new-password"
                className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] placeholder:text-[#A0A0A0]"
              />
              {confirmPassword && (
                <p className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-[#2592FF]' : 'text-red-500'}`}>
                  {newPassword === confirmPassword ? t.mypage.password_match : t.mypage.password_no_match}
                </p>
              )}
            </Field>
            {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
            {pwSuccess && <p className="text-[#2592FF] text-xs">{t.mypage.password_success}</p>}
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#F0F1F5] text-sm font-medium text-[#494949] disabled:opacity-40"
              disabled={pwSaving || !newPassword || !confirmPassword}
            >
              {pwSaving ? t.mypage.password_changing : t.mypage.password_change_btn}
            </button>
          </form>
        </div>

        {/* 로그아웃 / 계정 삭제 */}
        <div className="bg-white rounded-xl px-4 py-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-sm text-red-500 py-3 text-left"
          >
            {t.mypage.logout}
          </button>
          <div className="border-t border-[#F5F5F5]" />
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full text-xs text-[#A0A0A0] py-3 text-left"
          >
            {t.mypage.delete_account}
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[#161616]">{label}</span>
        {hint && <span className="text-xs text-[#A0A0A0]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
