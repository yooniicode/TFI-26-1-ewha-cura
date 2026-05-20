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
  if (loading) return <AppShell><Spinner /></AppShell>
  if (!meLoading && me && me.role !== 'admin' && !me.entityId) {
    window.location.replace('/auth/complete')
    return null
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">{t.mypage.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {me?.role === 'admin' ? t.mypage.role_admin : me?.role === 'interpreter' ? t.mypage.role_interpreter : t.mypage.role_patient} · {me?.name}
          </p>
        </div>

        {/* Admin profile management disabled.
        {me?.role === 'admin' && (
          <div className="space-y-6">
            <form onSubmit={e => { e.preventDefault(); saveAdminProfile() }} className="space-y-4">
              <div>
                <label className="label">{t.mypage.center_name_label}</label>
                <select className="input mb-2" value={centerId} onChange={e => setCenterId(e.target.value)}>
                  <option value="">{t.mypage.center_new_option}</option>
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
                <input className="input" value={centerName} onChange={e => setCenterName(e.target.value)} placeholder={t.mypage.center_example} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="label">{t.mypage.center_phone}</label>
                  <input className="input" value={centerPhone} onChange={e => setCenterPhone(e.target.value)} placeholder={t.mypage.center_phone_placeholder} />
                </div>
                <div>
                  <label className="label">{t.mypage.center_address}</label>
                  <input className="input" value={centerAddress} onChange={e => setCenterAddress(e.target.value)} placeholder={t.mypage.center_address_placeholder} />
                </div>
              </div>
              <div>
                <label className="label">{t.mypage.nickname}</label>
                <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t.mypage.nickname_placeholder} />
              </div>
              {adminSaveError && <p className="text-red-500 text-xs">{adminSaveError.message}</p>}
              {centerSaveError && <p className="text-red-500 text-xs">{centerSaveError.message}</p>}
              {adminSaved && <p className="text-green-600 text-xs">{t.mypage.admin_save_success}</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" className="btn-secondary w-full" disabled={savingCenterInfo} onClick={() => saveCenterInfo()}>
                  {savingCenterInfo ? t.mypage.saving : centerId ? t.mypage.center_update : t.mypage.center_create}
                </button>
                <button type="submit" className="btn-primary w-full" disabled={savingAdminProfile}>
                  {savingAdminProfile ? t.mypage.saving : t.mypage.admin_save}
                </button>
              </div>
            </form>

          </div>
        )}
        */}

        {me?.role !== 'admin' && (
          <form onSubmit={e => { e.preventDefault(); save() }} className="space-y-4">
            <div>
              <label className="label">{t.mypage.name_label} <span className="text-gray-400 font-normal text-xs ml-1">{t.mypage.name_hint}</span></label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.mypage.name_placeholder}
                required
              />
            </div>
            {me?.role === 'patient' && (
              <>
                <div>
                  <label className="label">{t.mypage.phone}</label>
                  <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="label">{t.mypage.region}</label>
                  <input className="input" value={region} onChange={e => setRegion(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t.mypage.visa_type}</label>
                  <select className="input" value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                    {VISA_TYPES.map(value => (
                      <option key={value} value={value}>{labels.visa[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t.mypage.visa_note}</label>
                  <input className="input" value={visaNote} onChange={e => setVisaNote(e.target.value)} />
                </div>
                <div className="rounded-lg border border-gray-100 bg-white p-3 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">{t.patient.affiliation_center}</p>
                    <div className="mt-2 space-y-1">
                      {(patient?.centers ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400">{t.patient.no_center}</p>
                      ) : (
                        patient?.centers.map(center => (
                          <p key={center.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {center.name}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">{t.patient.add_center}</label>
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
                    className="btn-secondary w-full"
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
              </>
            )}

            {me?.role === 'interpreter' && (
              <>
                <div>
                  <label className="label">{t.mypage.phone}</label>
                  <input className="input" value={intPhone} onChange={e => setIntPhone(e.target.value)} placeholder="010-0000-0000" />
                  <p className="text-xs text-gray-500 mt-2">{t.mypage.interpreter_role_note}</p>
                </div>
                <div>
                  <label className="label">{t.mypage.languages}</label>
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
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            selected
                              ? 'border-primary-600 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {language}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="label">{t.mypage.availability}</label>
                  <textarea
                    className="input min-h-20 resize-none"
                    value={availabilityNote}
                    onChange={e => setAvailabilityNote(e.target.value)}
                    placeholder={t.mypage.availability_placeholder}
                  />
                </div>
              </>
            )}

            {saveError && <p className="text-red-500 text-xs">{saveError.message}</p>}
            {isSuccess && <p className="text-green-600 text-xs">{t.mypage.save_success}</p>}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? t.mypage.saving : t.common.save}
            </button>
          </form>
        )}

        <div className="border-t pt-5">
          <h2 className="font-semibold text-sm mb-3">{t.mypage.password_change}</h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="label">{t.mypage.new_password}</label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t.mypage.password_min_hint}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">{t.mypage.password_confirm}</label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t.mypage.password_reenter}
                autoComplete="new-password"
              />
              {confirmPassword && (
                <p className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {newPassword === confirmPassword ? t.mypage.password_match : t.mypage.password_no_match}
                </p>
              )}
            </div>
            {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
            {pwSuccess && <p className="text-green-600 text-xs">{t.mypage.password_success}</p>}
            <button
              type="submit"
              className="btn-secondary w-full"
              disabled={pwSaving || !newPassword || !confirmPassword}
            >
              {pwSaving ? t.mypage.password_changing : t.mypage.password_change_btn}
            </button>
          </form>
        </div>

        <div className="border-t pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-sm text-red-500 hover:text-red-600 py-2"
          >
            {t.mypage.logout}
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full text-xs text-gray-400 hover:text-gray-500 py-2 border-t mt-2"
          >
            {t.mypage.delete_account}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
