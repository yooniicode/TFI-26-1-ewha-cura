'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { getRequestedMemberRole } from '@/lib/authMetadata'
import { createClient } from '@/lib/supabase'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import type { Gender, Nationality, UserRole, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import PasswordInput from '@/components/ui/PasswordInput'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { INTERPRETER_LANGUAGE_OPTIONS } from '@/lib/constants'

type ProfileRole = Extract<UserRole, 'interpreter' | 'patient'>

function normalizeLanguages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

export default function AuthCompletePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [checking, setChecking] = useState(true)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [isOtpUser, setIsOtpUser] = useState(false)
  const [role, setRole] = useState<ProfileRole | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [availabilityNote, setAvailabilityNote] = useState('')
  const [nationality, setNationality] = useState<Nationality>('OTHER')
  const [gender, setGender] = useState<Gender>('OTHER')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [bootstrapCenterId, setBootstrapCenterId] = useState('')
  const [bootstrapCenterName, setBootstrapCenterName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializationError, setInitializationError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        router.replace('/login')
        setChecking(false)
        return
      }

      const metadata = session.user.user_metadata ?? {}
      const requestedMemberRole = getRequestedMemberRole(metadata)
      if (requestedMemberRole?.role === 'interpreter') setRole('interpreter')
      if (typeof metadata.name === 'string') setName(metadata.name)
      if (typeof metadata.phone === 'string') setPhone(metadata.phone)
      setLanguages(normalizeLanguages(metadata.languages))
      if (typeof metadata.availability_note === 'string') setAvailabilityNote(metadata.availability_note)
      if (typeof metadata.availabilityNote === 'string') setAvailabilityNote(metadata.availabilityNote)
      if (typeof metadata.requested_center_id === 'string') setBootstrapCenterId(metadata.requested_center_id)
      if (typeof metadata.center_id === 'string') setBootstrapCenterId(metadata.center_id)
      if (typeof metadata.requested_center_name === 'string') setBootstrapCenterName(metadata.requested_center_name)

      try {
        const b64 = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(b64))
        setIsOtpUser(payload.amr?.some((a: { method: string }) => a.method === 'otp') ?? false)
      } catch { /* ignore decode errors */ }

      const completeSignup = requestedMemberRole?.role === 'interpreter'
        ? authApi.completeSignup().catch(() => undefined)
        : Promise.resolve()

      completeSignup
        .then(() => authApi.me())
        .then((res) => {
          if (res.payload.role === 'admin') {
            router.replace('/dashboard')
            return
          }
          if (requestedMemberRole) {
            if (res.payload.role === 'interpreter' && res.payload.entityId) {
              router.replace('/dashboard')
              return
            }
            // 관리자 승인 없이 바로 프로필 입력으로 진행
            setRole('interpreter')
            setNeedsProfile(true)
            return
          }
          setRole(res.payload.role === 'interpreter' ? 'interpreter' : 'patient')
          if (res.payload?.entityId) {
            router.replace('/dashboard')
          } else {
            setNeedsProfile(true)
          }
        })
        .catch(async (e) => {
          if (e instanceof ApiError && e.isUnauthorized) {
            await supabase.auth.signOut()
            router.replace('/login')
            return
          }
          setInitializationError(e instanceof Error ? e.message : t.auth_complete.err_profile_save)
        })
        .finally(() => setChecking(false))
    })
  }, [router, t.auth_complete.err_profile_save])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) { setError(t.auth_complete.err_profile_save); return }
    if (!name.trim()) { setError(t.auth_complete.err_name); return }
    if (role === 'patient' && !phone.trim()) { setError(t.auth_complete.err_phone); return }
    if (role === 'patient' && !bootstrapCenterId) {
      setError(t.auth_complete.err_center)
      return
    }
    if (role === 'interpreter' && !bootstrapCenterId && !bootstrapCenterName.trim()) {
      setError(t.auth_complete.err_center)
      return
    }
    if (role === 'interpreter' && languages.length === 0) {
      setError(t.auth_complete.err_languages)
      return
    }
    if (isOtpUser && newPassword) {
      if (newPassword.length < 8) { setError(t.auth_complete.err_password_min); return }
      if (newPassword !== newPasswordConfirm) { setError(t.auth_complete.err_password_confirm); return }
    }
    setLoading(true)
    setError('')
    try {
      await authApi.registerProfile({
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
        nationality: role === 'patient' ? nationality : undefined,
        gender: role === 'patient' ? gender : undefined,
        visaType: role === 'patient' ? visaType : undefined,
        interpreterRole: role === 'interpreter' ? 'ACTIVIST' : undefined,
        centerId: role === 'interpreter' || role === 'patient' ? bootstrapCenterId || undefined : undefined,
        centerName: role === 'interpreter' ? bootstrapCenterName.trim() || undefined : undefined,
        languages: role === 'interpreter' ? languages : undefined,
        availabilityNote: role === 'interpreter' ? availabilityNote.trim() || undefined : undefined,
      })
      if (isOtpUser && newPassword) {
        await createClient().auth.updateUser({ password: newPassword })
      }
      await createClient().auth.refreshSession()
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : t.auth_complete.err_profile_save)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">{t.auth_complete.just_a_moment}</p>
      </div>
    )
  }

  if (initializationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm w-full text-center py-8">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h1 className="text-xl font-bold text-primary-700">{t.auth_complete.profile_title}</h1>
          <p className="text-sm text-red-500 mt-3">{initializationError}</p>
          <div className="mt-6 space-y-2">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => window.location.reload()}
            >
              {t.auth_complete.recheck}
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={async () => {
                await createClient().auth.signOut()
                router.replace('/login')
              }}
            >
              {t.auth.logout}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!needsProfile || !role) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm w-full">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-primary-700">{t.auth_complete.profile_title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {role === 'interpreter'
              ? t.auth_complete.profile_subtitle_interpreter
              : t.auth_complete.profile_subtitle_patient}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t.auth_complete.name}</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">{t.auth_complete.phone}</label>
            <input
              type="text"
              className="input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          {(role === 'interpreter' || role === 'patient') && (
            <div>
              <label className="label">{t.auth_complete.work_center}</label>
              <CenterSearchSelect
                valueName={bootstrapCenterName}
                placeholder={t.auth_complete.center_search_placeholder}
                onSelect={(center) => {
                  setBootstrapCenterId(center.id)
                  setBootstrapCenterName(center.name)
                }}
              />
            </div>
          )}

          {role === 'interpreter' && (
            <>
              <div>
                <label className="label">{t.auth_complete.languages}</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERPRETER_LANGUAGE_OPTIONS.map(language => {
                    const selected = languages.includes(language)
                    return (
                      <button
                        key={language}
                        type="button"
                        onClick={() => {
                          setLanguages(prev => selected
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
                <label className="label">{t.auth_complete.availability}</label>
                <textarea
                  className="input min-h-20 resize-none"
                  value={availabilityNote}
                  onChange={e => setAvailabilityNote(e.target.value)}
                  placeholder={t.auth_complete.availability_placeholder}
                />
              </div>
            </>
          )}

          {role === 'patient' && (
            <>
              <div>
                <label className="label">{t.auth_complete.nationality}</label>
                <select className="input" value={nationality} onChange={e => setNationality(e.target.value as Nationality)}>
                  {NATIONALITIES.map(value => (
                    <option key={value} value={value}>{labels.nationality[value]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t.auth_complete.gender}</label>
                <select className="input" value={gender} onChange={e => setGender(e.target.value as Gender)}>
                  {GENDERS.map(value => (
                    <option key={value} value={value}>{labels.gender[value]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t.auth_complete.visa}</label>
                <select className="input" value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                  {VISA_TYPES.map(value => (
                    <option key={value} value={value}>{labels.visa[value]}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {isOtpUser && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-gray-500">{t.auth_complete.password_optional_desc}</p>
              <div>
                <label className="label">{t.auth_complete.password}</label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder={t.auth_complete.password_min_hint}
                  autoComplete="new-password"
                />
              </div>
              {newPassword && (
                <div>
                  <label className="label">{t.auth_complete.password_confirm}</label>
                  <PasswordInput
                    value={newPasswordConfirm}
                    onChange={setNewPasswordConfirm}
                    placeholder={t.auth_complete.password_reenter}
                    autoComplete="new-password"
                  />
                  {newPasswordConfirm && (
                    <p className={`text-xs mt-1 ${newPassword === newPasswordConfirm ? 'text-green-600' : 'text-red-500'}`}>
                      {newPassword === newPasswordConfirm
                        ? t.auth_complete.password_match
                        : t.auth_complete.password_no_match}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t.auth_complete.starting : t.auth_complete.start}
          </button>
        </form>
      </div>
    </div>
  )
}
