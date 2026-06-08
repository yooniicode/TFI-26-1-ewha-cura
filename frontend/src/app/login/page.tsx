'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { setAccessToken } from '@/lib/auth-token'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import type { Gender, Nationality, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import PasswordInput from '@/components/ui/PasswordInput'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

type SignupType = 'patient' | 'interpreter'
type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const [mode, setMode] = useState<Mode>('login')

  // 로그인
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // 회원가입
  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('')
  const [accountType, setAccountType] = useState<SignupType>('patient')
  const [nationality, setNationality] = useState<Nationality>('OTHER')
  const [gender, setGender] = useState<Gender>('OTHER')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')
  const [phone, setPhone] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [signupStep, setSignupStep] = useState<1 | 2>(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ─── 로그인 ────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const loginEmail = email.trim()
    if (!loginEmail) { setError(t.login.err_email); return }
    if (!password) { setError(t.login.err_password); return }
    setLoading(true); setError('')
    try {
      const res = await authApi.login({ email: loginEmail, password })
      if (res.payload?.token) {
        setAccessToken(res.payload.token)
        router.replace('/dashboard')
      }
    } catch (e) {
      if (e instanceof ApiError && e.isNotFound) {
        setError(t.login.err_not_found)
      } else {
        setError(e instanceof Error ? e.message : t.login.err_invalid_credentials)
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── 회원가입 step 1 → 2 ───────────────────────────────────────────────────

  function handleNextStep() {
    if (!name.trim()) { setError(t.login.err_name); return }
    if (!centerId) { setError(t.login.err_center_select); return }
    setError(''); setSignupStep(2)
  }

  // ─── 회원가입 제출 ─────────────────────────────────────────────────────────

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!signupEmail.trim()) { setError(t.login.err_email); return }
    if (!signupPassword) { setError(t.login.err_password); return }
    if (signupPassword.length < 8) { setError(t.login.err_password_min); return }
    if (signupPassword !== signupPasswordConfirm) { setError(t.login.err_password_confirm); return }
    setLoading(true); setError('')
    try {
      const res = await authApi.signup({
        email: signupEmail.trim(),
        password: signupPassword,
        name: name.trim(),
        role: accountType,
        phone: phone.trim() || undefined,
        centerId: centerId || undefined,
        centerName: centerName.trim() || undefined,
        ...(accountType === 'patient' ? { nationality, gender, visaType } : {}),
        ...(accountType === 'interpreter' ? { interpreterRole: 'ACTIVIST' as const } : {}),
      })
      if (res.payload?.token) {
        setAccessToken(res.payload.token)
        router.replace('/dashboard')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.login.err_auth_unknown)
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setError('')
    setSignupStep(1)
    setMode(next)
  }

  // ─── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col max-w-lg mx-auto">

      {/* 헤더 */}
      <header className="bg-white px-5 py-4 flex items-center justify-between border-b border-[#EEEEEE]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2592FF] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <span className="text-base font-bold text-[#161616]">LinkUs</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-[#EEEEEE] flex">
        {(['login', 'signup'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${
              mode === m ? 'text-[#2592FF]' : 'text-[#A0A0A0]'
            }`}
          >
            {m === 'login' ? t.auth.login : t.auth.signup}
            {mode === m && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2592FF] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 px-4 py-6">

        {/* ── 로그인 ─────────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="bg-white rounded-2xl px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.auth.email}</label>
                <input
                  type="email"
                  className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/30"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.login.email_placeholder}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#161616] mb-1.5">{t.auth.password}</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder={t.login.password_placeholder}
                  autoComplete="current-password"
                  className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/30"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full h-[56px] bg-[#2592FF] rounded-2xl text-base font-bold text-white disabled:opacity-40 transition-opacity hover:bg-[#1a7ee6] active:bg-[#1568c7]"
              disabled={loading}
            >
              {loading ? t.login.logging_in : t.auth.login}
            </button>

            {/* 소셜 로그인 구분선 */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[#EEEEEE]" />
              <span className="text-xs text-[#A0A0A0]">{t.common.or}</span>
              <div className="flex-1 h-px bg-[#EEEEEE]" />
            </div>

            {/* 카카오 로그인 */}
            <KakaoButton label={`Kakao ${t.auth.login}`} />

            <p className="text-center text-sm text-[#808080] pt-1">
              <button type="button" onClick={() => switchMode('signup')} className="text-[#2592FF] font-semibold hover:underline">
                {t.auth.signup}
              </button>
            </p>
          </form>
        )}

        {/* ── 회원가입 ────────────────────────────────────────────────────────── */}
        {mode === 'signup' && (
          <div className="space-y-3">

            {/* 카카오 빠른 가입 */}
            <KakaoButton label={`Kakao ${t.auth.signup}`} />

            {/* 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#EEEEEE]" />
              <span className="text-xs text-[#A0A0A0]">{t.common.or} {t.auth.email} {t.auth.signup}</span>
              <div className="flex-1 h-px bg-[#EEEEEE]" />
            </div>

          <form onSubmit={handleSignup} className="space-y-3">

            {/* 스텝 인디케이터 */}
            <div className="flex items-center gap-2 px-1 mb-1">
              {[1, 2].map(n => (
                <div key={n} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    signupStep >= n ? 'bg-[#2592FF] text-white' : 'bg-[#EEEEEE] text-[#A0A0A0]'
                  }`}>
                    {signupStep > n ? (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : n}
                  </div>
                  <span className={`text-xs font-medium ${signupStep >= n ? 'text-[#2592FF]' : 'text-[#A0A0A0]'}`}>
                    {n === 1 ? t.mypage.title : t.auth.signup}
                  </span>
                  {n === 1 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${signupStep > 1 ? 'bg-[#2592FF]' : 'bg-[#EEEEEE]'}`} />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {signupStep === 1 && (
              <div className="bg-white rounded-2xl px-5 py-5 space-y-4">
                {/* 이름 */}
                <FormField label={t.auth.name}>
                  <input
                    type="text"
                    className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.auth.name}
                  />
                </FormField>

                {/* 역할 선택 */}
                <FormField label={t.login.account_type}>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'patient' as SignupType, label: t.login.type_patient, desc: t.login.type_patient_desc, icon: '/icons/immigrant/home/진료기록.svg' },
                      { value: 'interpreter' as SignupType, label: t.login.type_interpreter, desc: t.login.type_interpreter_desc, icon: '/icons/interpreter/home/담당환자.svg' },
                    ] as const).map(({ value, label, desc, icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setAccountType(value); setCenterId(''); setCenterName('') }}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          accountType === value
                            ? 'border-[#2592FF] bg-[#f3f9ff]'
                            : 'border-[#EEEEEE] bg-white hover:border-[#D1D1D1]'
                        }`}
                      >
                        <img src={icon} alt="" width={22} height={22} className="mb-2" />
                        <p className={`text-sm font-bold ${accountType === value ? 'text-[#2592FF]' : 'text-[#161616]'}`}>{label}</p>
                        <p className="text-xs text-[#A0A0A0] mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                </FormField>

                {/* 전화번호 */}
                <FormField label={t.login.phone}>
                  <input
                    type="text"
                    className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </FormField>

                {/* 센터 */}
                <FormField label={t.login.work_center}>
                  <CenterSearchSelect
                    valueName={centerName}
                    placeholder={t.login.center_search_placeholder}
                    onSelect={center => { setCenterId(center.id); setCenterName(center.name) }}
                  />
                </FormField>

                {/* 이주민 전용 */}
                {accountType === 'patient' && (
                  <>
                    <FormField label={t.login.nationality}>
                      <select
                        className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none"
                        value={nationality}
                        onChange={e => setNationality(e.target.value as Nationality)}
                      >
                        {NATIONALITIES.map(v => <option key={v} value={v}>{labels.nationality[v]}</option>)}
                      </select>
                    </FormField>
                    <FormField label={t.login.gender}>
                      <div className="grid grid-cols-3 gap-2">
                        {GENDERS.map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setGender(v)}
                            className={`rounded-xl py-3 text-sm font-medium transition-all border-2 ${
                              gender === v
                                ? 'border-[#2592FF] bg-[#f3f9ff] text-[#2592FF]'
                                : 'border-[#EEEEEE] bg-white text-[#494949] hover:border-[#D1D1D1]'
                            }`}
                          >
                            {labels.gender[v]}
                          </button>
                        ))}
                      </div>
                    </FormField>
                    <FormField label={t.login.visa}>
                      <select
                        className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none"
                        value={visaType}
                        onChange={e => setVisaType(e.target.value as VisaType)}
                      >
                        {VISA_TYPES.map(v => <option key={v} value={v}>{labels.visa[v]}</option>)}
                      </select>
                    </FormField>
                  </>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="button"
                  className="w-full h-[56px] bg-[#2592FF] rounded-2xl text-base font-bold text-white hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
                  onClick={handleNextStep}
                >
                  {t.common.next_page}
                </button>
              </div>
            )}

            {/* Step 2 */}
            {signupStep === 2 && (
              <div className="bg-white rounded-2xl px-5 py-5 space-y-4">
                <FormField label={t.auth.email}>
                  <input
                    type="email"
                    className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder={t.login.email_placeholder}
                  />
                </FormField>
                <FormField label={t.auth.password}>
                  <PasswordInput
                    value={signupPassword}
                    onChange={setSignupPassword}
                    placeholder={t.login.password_min_hint}
                    autoComplete="new-password"
                    className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                  />
                </FormField>
                <FormField label={t.login.password_confirm}>
                  <PasswordInput
                    value={signupPasswordConfirm}
                    onChange={setSignupPasswordConfirm}
                    placeholder={t.login.password_reenter}
                    autoComplete="new-password"
                    className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none placeholder:text-[#A0A0A0]"
                  />
                  {signupPasswordConfirm && (
                    <p className={`text-xs mt-1.5 ${signupPassword === signupPasswordConfirm ? 'text-[#2592FF]' : 'text-red-500'}`}>
                      {signupPassword === signupPasswordConfirm ? t.login.password_match : t.login.password_no_match}
                    </p>
                  )}
                </FormField>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="w-[100px] h-[56px] bg-[#F0F1F5] rounded-2xl text-base font-semibold text-[#494949] hover:bg-[#e4e4e8] transition-colors"
                    onClick={() => { setError(''); setSignupStep(1) }}
                  >
                    {t.common.prev_page}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-[56px] bg-[#2592FF] rounded-2xl text-base font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
                    disabled={loading}
                  >
                    {loading ? t.login.signing_up : t.auth.signup}
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-[#808080] pt-1">
              {t.login.already_have_account}{' '}
              <button type="button" onClick={() => switchMode('login')} className="text-[#2592FF] font-semibold hover:underline">
                {t.auth.login}
              </button>
            </p>
          </form>
          </div>
        )}
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#161616] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ─── 카카오 버튼 ─────────────────────────────────────────────────────────────

function KakaoButton({ label }: { label: string }) {
  const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
  const REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI
    ?? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/kakao/callback`

  if (!KAKAO_CLIENT_ID) return null

  function handleKakao() {
    const params = new URLSearchParams({
      client_id: KAKAO_CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
    })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
  }

  return (
    <button
      type="button"
      onClick={handleKakao}
      className="w-full h-[56px] bg-[#FEE500] rounded-2xl text-[#3A1D1D] text-base font-bold flex items-center justify-center gap-2.5 hover:bg-[#f5dc00] active:bg-[#e8d000] transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M10 2C5.589 2 2 4.808 2 8.25c0 2.16 1.347 4.065 3.393 5.183l-.863 3.196c-.076.283.258.511.502.348l3.712-2.49A9.53 9.53 0 0010 14.5c4.411 0 8-2.808 8-6.25S14.411 2 10 2z"
          fill="#3A1D1D"
        />
      </svg>
      {label}
    </button>
  )
}
