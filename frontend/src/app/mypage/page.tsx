'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { adminApi, centerApi, patientApi, interpreterApi, authApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { clearAccessToken } from '@/lib/auth-token'
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
    enabled: me?.role === 'admin',
  })

  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: queryKeys.centers,
    queryFn: () => centerApi.list().then(r => r.payload ?? []),
    enabled: me?.role === 'admin',
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
    const selected = centers.find(c => c.id === centerId)
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
        const body = { name: centerName.trim(), address: centerAddress.trim() || undefined, phone: centerPhone.trim() || undefined, active: true }
        return centerId
          ? centerApi.update(centerId, body).then(r => r.payload as Center)
          : centerApi.create(body).then(r => r.payload as Center)
      },
      onSuccess: (center) => {
        setCenterId(center.id)
        queryClient.invalidateQueries({ queryKey: queryKeys.centers })
      },
    })

  // 프로필 사진 — me.avatarUrl이 권위 소스, localStorage는 같은 세션 내 캐시
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    if (me?.avatarUrl) setAvatarUrl(me.avatarUrl)
  }, [me?.avatarUrl])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !me?.authUserId) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('userId', me.authUserId)
      const uploadRes = await fetch('/api/upload/avatar', { method: 'POST', body: form })
      if (!uploadRes.ok) {
        const { error } = await uploadRes.json() as { error?: string }
        throw new Error(error ?? 'Upload failed')
      }
      const { url } = await uploadRes.json() as { url: string }
      await authApi.updateAvatar(url)
      setAvatarUrl(url)
      queryClient.setQueryData(queryKeys.me, (old: typeof me) =>
        old ? { ...old, avatarUrl: url } : old
      )
    } catch (err) {
      console.error('Avatar upload failed:', err)
      alert(err instanceof Error ? err.message : t.mypage.err_profile)
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError(''); setPwSuccess(false)
    if (!currentPassword) { setPwError(t.login.err_password); return }
    if (newPassword.length < 8) { setPwError(t.mypage.err_password_min); return }
    if (newPassword !== confirmPassword) { setPwError(t.mypage.err_password_confirm); return }
    setPwSaving(true)
    try {
      await authApi.changePassword({ currentPassword, newPassword })
      setPwSuccess(true)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) {
      setPwError(e instanceof Error ? e.message : t.mypage.delete_error)
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!confirm(t.mypage.delete_confirm)) return
    try {
      await authApi.deleteAccount()
      clearAccessToken()
      window.location.href = '/login'
    } catch { alert(t.mypage.delete_error) }
  }

  async function handleLogout() {
    try {
      await authApi.logout()
    } catch {
      // 토큰이 이미 만료된 경우에도 클라이언트 세션은 정리한다.
    } finally {
      clearAccessToken()
      queryClient.clear()
      window.location.href = '/login'
    }
  }

  const loading = meLoading || patientLoading || interpreterLoading || adminProfileLoading || centersLoading
  if (loading) {
    return (
      <AppShell noPadding>
        <PageHeader title={t.mypage.title} />
        <div className="flex justify-center pt-20"><Spinner /></div>
      </AppShell>
    )
  }
  if (!meLoading && me && me.role !== 'admin' && !me.entityId) {
    window.location.replace('/auth/complete')
    return null
  }

  const roleLabel = me?.role === 'admin' ? t.mypage.role_admin
    : me?.role === 'interpreter' ? t.mypage.role_interpreter
    : t.mypage.role_patient

  const genderIconSrc = me?.role === 'patient' && patient
    ? patient.gender === 'FEMALE'
      ? '/icons/common/gender/big-여성-배경o.svg'
      : '/icons/common/gender/big-남성-배경o.svg'
    : null

  return (
    <AppShell noPadding>
      <PageHeader title={t.mypage.title} />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-10 min-h-screen space-y-3">

        {/* 프로필 카드 — 상단 */}
        <div className="bg-white rounded-2xl px-5 py-5 flex items-center gap-4">
          {/* 아바타 + 업로드 버튼 */}
          <label className="relative shrink-0 cursor-pointer group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#EEEEEE]"
              />
            ) : genderIconSrc ? (
              <img src={genderIconSrc} alt="" width={56} height={56} />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#DEE2FF] flex items-center justify-center text-2xl font-bold text-indigo-700">
                {me?.name?.charAt(0) ?? '?'}
              </div>
            )}
            {/* 카메라 오버레이 */}
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading ? (
                <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </label>
          <div className="min-w-0">
            <p className="text-xl font-bold text-[#161616] truncate">{me?.name ?? t.chat.no_name}</p>
            <p className="text-sm text-[#808080] mt-0.5">
              {roleLabel}
              {me?.centerName ? ` · ${me.centerName}` : ''}
            </p>
          </div>
        </div>

        {/* 프로필 정보 수정 */}
        {me?.role !== 'admin' && (
          <Section title={t.auth_complete.profile_title}>
            <form onSubmit={e => { e.preventDefault(); save() }} className="space-y-4">
              <Field label={t.mypage.name_label}>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t.mypage.name_placeholder} required />
              </Field>

              {me?.role === 'patient' && (
                <>
                  <Field label={t.mypage.phone}>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
                  </Field>
                  <Field label={t.mypage.region}>
                    <Input value={region} onChange={e => setRegion(e.target.value)} />
                  </Field>
                  <Field label={t.mypage.visa_type}>
                    <select className={INPUT_CLS} value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                      {VISA_TYPES.map(v => <option key={v} value={v}>{labels.visa[v]}</option>)}
                    </select>
                  </Field>
                  <Field label={t.mypage.visa_note}>
                    <Input value={visaNote} onChange={e => setVisaNote(e.target.value)} />
                  </Field>
                </>
              )}

              {me?.role === 'interpreter' && (
                <>
                  <Field label={t.mypage.phone}>
                    <Input value={intPhone} onChange={e => setIntPhone(e.target.value)} placeholder="010-0000-0000" />
                  </Field>
                  <Field label={t.mypage.languages}>
                    <LanguageToggleList
                      selected={interpreterLanguages}
                      options={INTERPRETER_LANGUAGE_OPTIONS}
                      onChange={setInterpreterLanguages}
                    />
                  </Field>
                  <Field label={t.mypage.availability}>
                    <textarea
                      className={`${INPUT_CLS} min-h-[80px] resize-none`}
                      value={availabilityNote}
                      onChange={e => setAvailabilityNote(e.target.value)}
                      placeholder={t.mypage.availability_placeholder}
                    />
                  </Field>
                </>
              )}

              {saveError && <p className="text-red-500 text-sm">{saveError.message}</p>}
              {isSuccess && <p className="text-[#2592FF] text-sm">{t.mypage.save_success}</p>}
              <ActionButton type="submit" variant="primary" disabled={saving}>
                {saving ? t.mypage.saving : t.common.save}
              </ActionButton>
            </form>
          </Section>
        )}

        {/* 소속 센터 (환자) */}
        {me?.role === 'patient' && (
          <Section title={t.patient.affiliation_center}>
            <div className="space-y-2 mb-3">
              {(patient?.centers ?? []).length === 0 ? (
                <p className="text-sm text-[#A0A0A0] text-center py-3">{t.patient.no_center}</p>
              ) : (
                patient?.centers.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-[#F5F5F5] rounded-xl px-4 py-3">
                    <div className="w-7 h-7 rounded-full bg-[#DEE2FF] flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-[#161616] truncate">{c.name}</p>
                  </div>
                ))
              )}
            </div>
            <CenterSearchSelect
              valueName={patientCenterName}
              placeholder={t.patient.center_search_placeholder}
              onSelect={c => { setPatientCenterId(c.id); setPatientCenterName(c.name) }}
            />
            {patientCenterError && <p className="text-red-500 text-xs mt-1">{patientCenterError.message}</p>}
            <ActionButton
              className="mt-3"
              variant="secondary"
              disabled={!patientCenterId || addingPatientCenter || (patient?.centers ?? []).some(c => c.id === patientCenterId)}
              onClick={() => addPatientCenter()}
            >
              {(patient?.centers ?? []).some(c => c.id === patientCenterId)
                ? t.patient.already_registered
                : addingPatientCenter ? t.patient.adding : t.patient.add_center}
            </ActionButton>
          </Section>
        )}

        {/* 비밀번호 변경 */}
        <Section title={t.mypage.password_change}>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Field label={t.auth.password}>
              <PasswordInput value={currentPassword} onChange={setCurrentPassword} placeholder={t.login.password_placeholder} autoComplete="current-password" className={INPUT_CLS} />
            </Field>
            <Field label={t.mypage.new_password}>
              <PasswordInput value={newPassword} onChange={setNewPassword} placeholder={t.mypage.password_min_hint} autoComplete="new-password" className={INPUT_CLS} />
            </Field>
            <Field label={t.mypage.password_confirm}>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder={t.mypage.password_reenter} autoComplete="new-password" className={INPUT_CLS} />
              {confirmPassword && (
                <p className={`text-xs mt-1 ${newPassword === confirmPassword ? 'text-[#2592FF]' : 'text-red-500'}`}>
                  {newPassword === confirmPassword ? t.mypage.password_match : t.mypage.password_no_match}
                </p>
              )}
            </Field>
            {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-[#2592FF] text-sm">{t.mypage.password_success}</p>}
            <ActionButton type="submit" variant="secondary" disabled={pwSaving || !newPassword || !confirmPassword}>
              {pwSaving ? t.mypage.password_changing : t.mypage.password_change_btn}
            </ActionButton>
          </form>
        </Section>

        {/* 로그아웃 / 계정 삭제 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold text-[#161616] hover:bg-[#F5F5F5] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t.mypage.logout}
          </button>
          <div className="h-px bg-[#F0F0F0] mx-5" />
          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm text-red-400 hover:bg-red-50 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
            {t.mypage.delete_account}
          </button>
        </div>

      </div>
    </AppShell>
  )
}

// ─── 공통 컴포넌트 ─────────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/20'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl px-5 py-5">
      <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#161616]">{label}</label>
      {children}
    </div>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLS} ${className}`} {...props} />
}

function ActionButton({
  children, variant = 'primary', className = '', type = 'button', disabled, onClick,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`w-full h-[52px] rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
        variant === 'primary'
          ? 'bg-[#2592FF] text-white hover:bg-[#1a7ee6] active:bg-[#1568c7]'
          : 'bg-[#F0F1F5] text-[#494949] hover:bg-[#e4e4e8]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

// ─── 언어 토글 리스트 ──────────────────────────────────────────────────────────

function LanguageToggleList({
  selected, options, onChange,
}: {
  selected: string[]
  options: string[]
  onChange: (langs: string[]) => void
}) {
  const { t } = useTranslation()
  // 선택된 언어가 없으면 빈 슬롯 1개로 시작
  const rows = selected.length > 0 ? selected : ['']

  function handleChange(idx: number, value: string) {
    const next = [...rows]
    next[idx] = value
    // 빈 값 제거 후 저장
    onChange(next.filter(Boolean))
  }

  function handleRemove(idx: number) {
    const next = rows.filter((_, i) => i !== idx)
    onChange(next.filter(Boolean))
  }

  function handleAdd() {
    // 아직 선택 안 된 첫 번째 언어 자동 선택
    const available = options.filter(o => !rows.includes(o))
    if (available.length === 0) return
    onChange([...rows.filter(Boolean), available[0]])
  }

  const canAdd = options.filter(o => !rows.includes(o)).length > 0

  return (
    <div className="flex flex-col gap-2">
      {rows.map((lang, idx) => {
        // 이 슬롯에서 선택 가능한 옵션: 현재 값 + 다른 슬롯에서 선택되지 않은 것
        const available = options.filter(o => o === lang || !rows.includes(o))
        return (
          <div key={idx} className="flex items-center gap-2">
            <div className={`flex-1 flex items-center gap-2 px-4 h-[52px] rounded-xl border ${
              lang ? 'border-[#2592FF] bg-[#f3f9ff]' : 'border-[#EEEEEE] bg-[#F5F5F5]'
            }`}>
              {/* 언어 아이콘 */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={lang ? '#2592FF' : '#808080'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
              </svg>
              <select
                value={lang}
                onChange={e => handleChange(idx, e.target.value)}
                className={`flex-1 bg-transparent text-[15px] font-medium outline-none appearance-none cursor-pointer ${
                  lang ? 'text-[#2592FF]' : 'text-[#808080]'
                }`}
              >
                {!lang && <option value="">{t.mypage.lang_select}</option>}
                {available.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {/* 체크 또는 드롭다운 화살표 */}
              {lang ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8L6.5 11.5L13 5" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 5L7 9L11 5" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            {/* 삭제 버튼 (슬롯이 2개 이상이거나 값이 있을 때) */}
            {(rows.length > 1 || lang) && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="w-10 h-10 rounded-full bg-[#F0F1F5] flex items-center justify-center shrink-0 hover:bg-[#e4e4e8] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="#808080" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {/* 추가 버튼 */}
      {canAdd && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 h-[44px] rounded-xl border border-dashed border-[#CCCCCC] text-[#808080] text-[14px] font-medium hover:border-[#2592FF] hover:text-[#2592FF] hover:bg-[#f3f9ff] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {t.mypage.lang_add}
        </button>
      )}
    </div>
  )
}
