'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { createClient } from '@/lib/supabase'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import type { Gender, Nationality, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import PasswordInput from '@/components/ui/PasswordInput'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

type SignupType = 'patient' | 'interpreter'

function isInvalidLoginCredentials(error: { message: string }) {
  return error.message.toLowerCase().includes('invalid login credentials')
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')
  const [accountType, setAccountType] = useState<SignupType>('patient')
  const [nationality, setNationality] = useState<Nationality>('OTHER')
  const [gender, setGender] = useState<Gender>('OTHER')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')
  const [phone, setPhone] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [isSignupMode, setIsSignupMode] = useState(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [callbackMessage, setCallbackMessage] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  function switchToSignupForMissingEmail() {
    setIsForgotPasswordMode(false)
    setIsSignupMode(true)
    setError(t.login.err_not_found)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errorCode = params.get('error')
    if (!errorCode) return
    const msgMap: Record<string, string> = {
      auth_link_browser_mismatch: t.login.err_browser_mismatch,
      auth_link_invalid: t.login.err_link_invalid,
      auth_callback_failed: t.login.err_callback_failed,
    }
    setCallbackMessage(msgMap[errorCode] ?? t.login.err_callback_failed)
    setIsSignupMode(false)
    setIsForgotPasswordMode(false)
    window.history.replaceState(null, '', '/login')
  }, [t])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const loginEmail = email.trim()
    if (!loginEmail) { setError(t.login.err_email); setLoading(false); return }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (error) {
      if (isInvalidLoginCredentials(error)) {
        try {
          const res = await authApi.emailExists(loginEmail)
          if (!res.payload.exists) {
            switchToSignupForMissingEmail()
            setLoading(false)
            return
          }
        } catch {
          // Keep Supabase's original error if the email existence lookup is unavailable.
        }
      }
      setError(error.message); setLoading(false); return
    }
    router.push('/auth/complete')
  }

  async function handleMagicLink() {
    if (!email) { setError(t.login.err_email); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })
    
    if (error) { 
      if (error.message.includes('Signups not allowed for otp') || error.status === 400) {
        switchToSignupForMissingEmail()
      } else {
        setError(error.message)
      }
      setLoading(false); return 
    }
    setMagicSent(true); setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError(t.login.err_name); return }
    if (!email) { setError(t.login.err_email); return }
    if (!signupPassword) { setError(t.login.err_password); return }
    if (signupPassword.length < 8) { setError(t.login.err_password_min); return }
    if (signupPassword !== signupPasswordConfirm) {
      setError(t.login.err_password_confirm)
      return
    }
    if ((accountType === 'patient' || accountType === 'interpreter') && !centerId) {
      setError(t.login.err_center_select)
      return
    }

    setLoading(true); setError('')
    const supabase = createClient()
    const requestedRole = accountType === 'patient' ? 'patient' : 'interpreter'
    const requestedInterpreterRole = accountType === 'interpreter' ? 'ACTIVIST' : undefined
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: name.trim(),
          phone,
          requested_role: requestedRole,
          ...(accountType !== 'patient'
            ? {
                requested_center_name: centerName.trim(),
                ...(centerId ? { requested_center_id: centerId } : {}),
              }
            : {}),
          ...(requestedInterpreterRole ? { requested_interpreter_role: requestedInterpreterRole } : {}),
          ...(accountType === 'patient' ? {
            requested_center_id: centerId,
            requested_center_name: centerName.trim(),
            nationality,
            gender,
            visa_type: visaType,
          } : {}),
        },
      },
    })

    if (error) { setError(error.message); setLoading(false); return }

    if (data.session) {
      router.push('/auth/complete')
    } else {
      setSignupDone(true)
      setLoading(false)
    }
  }

  async function handleForgotPassword(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!email) {
      setError(t.login.err_email)
      setIsForgotPasswordMode(true)
      setIsSignupMode(false)
      return
    }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setResetSent(true); setLoading(false)
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm w-full text-center py-10">
          <p className="text-4xl mb-4">📧</p>
          <h2 className="font-bold text-lg mb-2">{t.login.check_email}</h2>
          <p className="text-sm text-gray-500">{t.login.magic_link_sent(email)}</p>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm w-full text-center py-10">
          <p className="text-4xl mb-4">📧</p>
          <h2 className="font-bold text-lg mb-2">{t.login.check_email}</h2>
          <p className="text-sm text-gray-500">{t.login.reset_sent(email)}</p>
          <button
            type="button"
            className="btn-primary w-full mt-5"
            onClick={() => {
              setResetSent(false)
              setIsForgotPasswordMode(false)
            }}
          >
            {t.login.back_to_login}
          </button>
        </div>
      </div>
    )
  }

  if (signupDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-sm w-full text-center py-10">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="font-bold text-lg mb-2">{t.login.signup_done_title}</h2>
          <p className="text-sm text-gray-500">{t.login.signup_done_msg(email)}</p>
          <button
            type="button"
            className="btn-primary w-full mt-5"
            onClick={() => {
              setSignupDone(false)
              setIsSignupMode(false)
            }}
          >
            {t.login.back_to_login}
          </button>
        </div>
      </div>
    )
  }

  const accountTypes: { value: SignupType; label: string; desc: string }[] = [
    { value: 'patient', label: t.login.type_patient, desc: t.login.type_patient_desc },
    // Admin signup is disabled.
    { value: 'interpreter', label: t.login.type_interpreter, desc: t.login.type_interpreter_desc },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm w-full">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-700">{t.login.app_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.login.subtitle}</p>
        </div>

        {callbackMessage && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
            {callbackMessage}
          </div>
        )}

        {isForgotPasswordMode ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4 font-medium">{t.login.forgot_desc}</p>
              <label className="label">{t.auth.email}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.login.email_placeholder}
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t.login.sending : t.login.forgot_submit}
            </button>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => { setError(''); setIsForgotPasswordMode(false) }}
                className="text-sm text-gray-600 hover:underline"
              >
                {t.login.back_to_login_link}
              </button>
            </div>
          </form>
        ) : isSignupMode ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label">{t.auth.name}</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.auth.name}
                required
              />
            </div>
            <div>
              <label className="label">{t.login.account_type}</label>
              <div className="grid grid-cols-2 gap-2">
                {accountTypes.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAccountType(value)
                      if (value === 'patient') {
                        setCenterId('')
                        setCenterName('')
                      }
                    }}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      accountType === value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${accountType === value ? 'text-primary-700' : 'text-gray-700'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t.auth.email}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.login.email_placeholder}
                required
              />
            </div>
            <div>
              <label className="label">{t.login.phone}</label>
              <input
                type="text"
                className="input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            {accountType === 'patient' && (
              <div>
                <label className="label">{t.login.work_center}</label>
                <CenterSearchSelect
                  valueName={centerName}
                  placeholder={t.login.center_search_placeholder}
                  onSelect={(center) => {
                    setCenterId(center.id)
                    setCenterName(center.name)
                  }}
                />
              </div>
            )}
            {accountType === 'interpreter' && (
              <div>
                <label className="label">{t.login.work_center}</label>
                <CenterSearchSelect
                  valueName={centerName}
                  placeholder={t.login.center_search_placeholder}
                  onSelect={(center) => {
                    setCenterId(center.id)
                    setCenterName(center.name)
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">{t.login.center_admin_note}</p>
              </div>
            )}
            {accountType === 'patient' && (
              <>
                <div>
                  <label className="label">{t.login.nationality}</label>
                  <select className="input" value={nationality} onChange={e => setNationality(e.target.value as Nationality)}>
                    {NATIONALITIES.map(value => (
                      <option key={value} value={value}>{labels.nationality[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t.login.gender}</label>
                  <select className="input" value={gender} onChange={e => setGender(e.target.value as Gender)}>
                    {GENDERS.map(value => (
                      <option key={value} value={value}>{labels.gender[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t.login.visa}</label>
                  <select className="input" value={visaType} onChange={e => setVisaType(e.target.value as VisaType)}>
                    {VISA_TYPES.map(value => (
                      <option key={value} value={value}>{labels.visa[value]}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="label">{t.auth.password}</label>
              <PasswordInput
                value={signupPassword}
                onChange={setSignupPassword}
                placeholder={t.login.password_min_hint}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">{t.login.password_confirm}</label>
              <PasswordInput
                value={signupPasswordConfirm}
                onChange={setSignupPasswordConfirm}
                placeholder={t.login.password_reenter}
                required
                autoComplete="new-password"
              />
              {signupPasswordConfirm && (
                <p className={`text-xs mt-1 ${signupPassword === signupPasswordConfirm ? 'text-green-600' : 'text-red-500'}`}>
                  {signupPassword === signupPasswordConfirm ? t.login.password_match : t.login.password_no_match}
                </p>
              )}
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t.login.signing_up : t.auth.signup}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">{t.auth.email}</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.login.email_placeholder}
                  required
                />
              </div>
              <div>
                <label className="label">{t.auth.password}</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder={t.login.password_placeholder}
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? t.login.logging_in : t.auth.login}
              </button>
            </form>

            <div className="mt-3 text-center space-x-1">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="text-sm text-primary-600 hover:underline"
              >
                {t.login.magic_link}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => handleForgotPassword()}
                disabled={loading}
                className="text-sm text-primary-600 hover:underline"
              >
                {t.login.forgot_password}
              </button>
            </div>
          </>
        )}

        {!isForgotPasswordMode && (
          <div className="mt-4 text-center">
            <button
              type="button"
              disabled={loading}
              className="text-sm text-gray-600 hover:underline"
              onClick={() => {
                setError('')
                setIsSignupMode(prev => !prev)
              }}
            >
              {isSignupMode ? t.login.already_have_account : t.auth.signup}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
