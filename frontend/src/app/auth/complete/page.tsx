'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { getAccessToken, clearAccessToken } from '@/lib/auth-token'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import type { Gender, Nationality, UserRole, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { INTERPRETER_LANGUAGE_OPTIONS } from '@/lib/constants'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

type ProfileRole = Extract<UserRole, 'interpreter' | 'patient'>

export default function AuthCompletePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [checking, setChecking] = useState(true)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [role, setRole] = useState<ProfileRole | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [availabilityNote, setAvailabilityNote] = useState('')
  const [nationality, setNationality] = useState<Nationality>('OTHER')
  const [gender, setGender] = useState<Gender>('OTHER')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.replace('/login'); return }

    authApi.me()
      .then(res => {
        if (res.payload.role === 'admin' || res.payload.entityId) {
          router.replace('/dashboard')
        } else {
          setRole(res.payload.role === 'interpreter' ? 'interpreter' : 'patient')
          setNeedsProfile(true)
        }
      })
      .catch(async e => {
        if (e instanceof ApiError && e.isUnauthorized) {
          clearAccessToken()
          router.replace('/login')
        }
      })
      .finally(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return
    if (!name.trim()) { setError(t.auth_complete.err_name); return }
    if (role === 'patient' && !phone.trim()) { setError(t.auth_complete.err_phone); return }
    if (!centerId && !centerName.trim()) { setError(t.auth_complete.err_center); return }
    if (role === 'interpreter' && languages.length === 0) { setError(t.auth_complete.err_languages); return }
    setLoading(true); setError('')
    try {
      await authApi.registerProfile({
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
        nationality: role === 'patient' ? nationality : undefined,
        gender: role === 'patient' ? gender : undefined,
        visaType: role === 'patient' ? visaType : undefined,
        interpreterRole: role === 'interpreter' ? 'ACTIVIST' : undefined,
        centerId: centerId || undefined,
        centerName: centerName.trim() || undefined,
        languages: role === 'interpreter' ? languages : undefined,
        availabilityNote: role === 'interpreter' ? availabilityNote.trim() || undefined : undefined,
      })
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
  if (!needsProfile || !role) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm w-full">
        <div className="mb-4 flex justify-end"><LanguageSwitcher /></div>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-primary-700">{t.auth_complete.profile_title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {role === 'interpreter' ? t.auth_complete.profile_subtitle_interpreter : t.auth_complete.profile_subtitle_patient}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t.auth_complete.name}</label>
            <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t.auth_complete.phone}</label>
            <input type="text" className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </div>
          <div>
            <label className="label">{role === 'patient' ? '담당 센터' : t.auth_complete.work_center}</label>
            <CenterSearchSelect
              valueName={centerName}
              placeholder={t.auth_complete.center_search_placeholder}
              onSelect={c => { setCenterId(c.id); setCenterName(c.name) }}
            />
          </div>
          {role === 'interpreter' && (
            <>
              <div>
                <label className="label">{t.auth_complete.languages}</label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERPRETER_LANGUAGE_OPTIONS.map(lang => {
                    const selected = languages.includes(lang)
                    return (
                      <button
                        key={lang} type="button"
                        onClick={() => setLanguages(prev => selected ? prev.filter(l => l !== lang) : [...prev, lang])}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${selected ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {lang}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="label">{t.auth_complete.availability}</label>
                <textarea className="input min-h-20 resize-none" value={availabilityNote} onChange={e => setAvailabilityNote(e.target.value)} placeholder={t.auth_complete.availability_placeholder} />
              </div>
            </>
          )}
          {role === 'patient' && (
            <>
              <div>
                <label className="label">{t.auth_complete.nationality}</label>
                <select className="input" value={nationality} onChange={e => setNationality(e.target.value as Nationality)}>
                  {NATIONALITIES.map(v => <option key={v} value={v}>{labels.nationality[v]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.auth_complete.gender}</label>
                <select className="input" value={gender} onChange={e => setGender(e.target.value as Gender)}>
                  {GENDERS.map(v => <option key={v} value={v}>{labels.gender[v]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.auth_complete.visa}</label>
                <select className="input" value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                  {VISA_TYPES.map(v => <option key={v} value={v}>{labels.visa[v]}</option>)}
                </select>
              </div>
            </>
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
