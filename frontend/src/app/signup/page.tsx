'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { authApi } from '@/lib/api'
import { setAccessToken } from '@/lib/auth-token'
import PasswordInput from '@/components/ui/PasswordInput'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import { NATIONALITIES, VISA_TYPES, GENDERS, useEnumLabels } from '@/lib/i18n/enumLabels'
import type { Gender, Nationality, VisaType } from '@/lib/types'

type AccountType = 'patient' | 'interpreter'
type Step = 0 | 1 | 2 | 3 | 4 | 5

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18L9 12L15 6" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke="#161616" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ─── Completion graphic ───────────────────────────────────────────────────────

function CompletionMark() {
  return (
    <svg width="172" height="172" viewBox="0 0 172 172" fill="none" className="mx-auto">
      {/* Blue long arm */}
      <path d="M63 135L145 43" stroke="#2592FF" strokeWidth="44" strokeLinecap="round" opacity="0.6" />
      {/* Green short arm */}
      <path d="M28 92L68 137" stroke="#30C100" strokeWidth="44" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-[16px] font-medium text-[#494949]">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[18px] text-[#161616] outline-none placeholder:text-[#808080] focus:border-[#2592FF] bg-white transition-colors'

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()
  const labels = useEnumLabels()

  const [step, setStep] = useState<Step>(0)
  const [showExitModal, setShowExitModal] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('OTHER')
  const [phone, setPhone] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [nationality, setNationality] = useState<Nationality>('OTHER')
  const [visaType, setVisaType] = useState<VisaType>('OTHER')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function next() {
    setError('')
    if (step === 1) {
      if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
      if (!password) { setError('비밀번호를 입력해주세요.'); return }
      if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
      if (password !== confirmPassword) { setError('비밀번호 확인이 일치하지 않습니다.'); return }
    } else if (step === 2) {
      if (!accountType) { setError('가입 유형을 선택해주세요.'); return }
    } else if (step === 3) {
      if (!name.trim()) { setError('이름을 입력해주세요.'); return }
      if (!phone.trim()) { setError('연락처를 입력해주세요.'); return }
    }
    setStep((step + 1) as Step)
  }

  function prev() {
    setError('')
    setStep((step - 1) as Step)
  }

  async function handleSubmit() {
    setError('')
    if (!centerId && !centerName.trim()) { setError('담당 센터를 선택해주세요.'); return }
    setLoading(true)
    try {
      const res = await authApi.signup({
        email: email.trim(),
        password,
        name: name.trim(),
        role: accountType!,
        phone: phone.trim() || undefined,
        centerId: centerId || undefined,
        centerName: centerName.trim() || undefined,
        ...(accountType === 'patient' ? { nationality, gender, visaType } : {}),
        ...(accountType === 'interpreter' ? { interpreterRole: 'ACTIVIST' as const } : {}),
      })
      if (res.payload?.token) {
        setAccessToken(res.payload.token)
      }
      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleKakao() {
    const key = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    if (!key) return
    const redirectUri = `${window.location.origin}/auth/kakao/callback`
    const params = new URLSearchParams({ client_id: key, redirect_uri: redirectUri, response_type: 'code' })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const showBottomBar = step >= 1 && step <= 4
  const isLastFormStep = step === 4

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[402px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 h-[66px] shrink-0">
        {step === 0 ? (
          <button type="button" onClick={() => router.push('/')} className="w-6 h-6 flex items-center justify-center">
            <ChevronLeft />
          </button>
        ) : (
          <div className="w-6 h-6 opacity-0 pointer-events-none">
            <ChevronLeft />
          </div>
        )}
        <span className="text-[18px] font-semibold text-[#161616] tracking-[-0.5px]">회원가입</span>
        {step >= 1 && step <= 5 ? (
          <button type="button" onClick={() => setShowExitModal(true)} className="w-6 h-6 flex items-center justify-center">
            <CloseIcon />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Step 0: 랜딩 */}
        {step === 0 && (
          <div className="flex flex-col h-full min-h-[calc(100vh-66px)]">
            <div className="px-4 pt-8 pb-4">
              <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4]">
                안녕하세요<br />의료 소통 플랫폼
              </h1>
              <div className="flex items-center gap-1 mt-1">
                <div className="relative w-[116px] h-[40px] shrink-0">
                  <Image src="/icons/curawithfont.svg" alt="Cura" fill className="object-contain object-left" />
                </div>
                <span className="text-[28px] font-semibold text-[#161616] leading-[1.4]">입니다</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end px-4 pb-10 gap-5">
              <p className="text-center text-[18px] font-medium text-[#808080]">편한 방법으로 시작해보세요</p>
              <button
                type="button"
                onClick={() => { setError(''); setStep(1) }}
                className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] transition-colors"
              >
                이메일로 시작하기
              </button>
              <button
                type="button"
                onClick={handleKakao}
                className="w-full h-[60px] bg-[#FFE724] rounded-lg text-[#171502] text-[18px] font-semibold hover:bg-[#f5dc00] transition-colors"
              >
                카카오톡으로 시작하기
              </button>
            </div>
          </div>
        )}

        {/* Step 1: 이메일 & 비밀번호 */}
        {step === 1 && (
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              아이디와 비밀번호를<br />입력해주세요
            </h1>
            <div className="flex flex-col gap-5">
              <Field label="이메일 주소">
                <input
                  type="email"
                  className={inputCls}
                  placeholder="이메일 주소를 입력해주세요"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field label="비밀번호">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="비밀번호를 8자리 이상 입력해주세요"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </Field>
              <Field label="비밀번호 재확인">
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="비밀번호를 한번 더 입력해주세요"
                  autoComplete="new-password"
                  className={inputCls}
                />
                {confirmPassword && (
                  <p className={`text-sm mt-0.5 ${password === confirmPassword ? 'text-[#2592FF]' : 'text-red-500'}`}>
                    {password === confirmPassword ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                  </p>
                )}
              </Field>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 2: 유형 선택 */}
        {step === 2 && (
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-12">
              어떤 유형으로<br />가입할까요?
            </h1>
            <div className="flex gap-4">
              {/* 이주민 */}
              <button
                type="button"
                onClick={() => setAccountType('patient')}
                className={`flex-1 rounded-[20px] border p-5 flex flex-col gap-5 transition-all ${
                  accountType === 'patient'
                    ? 'border-[#2592FF] bg-[#F3F9FF]'
                    : 'border-[#EEEEEE] bg-white hover:border-[#D1D1D1]'
                }`}
              >
                <img src="/icons/signup/migrant.svg" alt="이주민" width={60} height={60} />
                <div className="text-left flex flex-col gap-1">
                  <p className={`text-[16px] font-semibold ${accountType === 'patient' ? 'text-[#2592FF]' : 'text-[#161616]'}`}>
                    이주민
                  </p>
                  <p className="text-[16px] font-medium text-[#161616] leading-[1.4]">
                    내 진료 기록을<br />직접 확인하고 싶어요
                  </p>
                </div>
              </button>

              {/* 통번역가 */}
              <button
                type="button"
                onClick={() => setAccountType('interpreter')}
                className={`flex-1 rounded-[20px] border p-5 flex flex-col gap-5 transition-all ${
                  accountType === 'interpreter'
                    ? 'border-[#30C100] bg-[#F3FFF0]'
                    : 'border-[#EEEEEE] bg-white hover:border-[#D1D1D1]'
                }`}
              >
                <img src="/icons/signup/interpreter.svg" alt="통번역가" width={60} height={60} />
                <div className="text-left flex flex-col gap-1">
                  <p className={`text-[16px] font-semibold ${accountType === 'interpreter' ? 'text-[#30C100]' : 'text-[#161616]'}`}>
                    통번역가
                  </p>
                  <p className="text-[16px] font-medium text-[#161616] leading-[1.4]">
                    진료 동행 기록을<br />작성하고 관리해요
                  </p>
                </div>
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>
        )}

        {/* Step 3: 기본 정보 (이름, 성별[이주민], 연락처) */}
        {step === 3 && (
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              기본 정보를<br />설정해주세요
            </h1>
            <div className="flex flex-col gap-5">
              <Field label="이름">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="성함을 입력해주세요"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </Field>
              {accountType === 'patient' && (
                <Field label="성별">
                  <select
                    className={`${inputCls} appearance-none`}
                    value={gender}
                    onChange={e => setGender(e.target.value as Gender)}
                  >
                    {GENDERS.map(g => (
                      <option key={g} value={g}>{labels.gender[g]}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="연락처">
                <input
                  type="tel"
                  className={inputCls}
                  placeholder="전화번호를 입력해주세요"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </Field>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 4: 추가 정보 (센터, 국적, 비자) */}
        {step === 4 && (
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              기본 정보를<br />설정해주세요
            </h1>
            <div className="flex flex-col gap-5">
              <Field label="담당 센터">
                <CenterSearchSelect
                  valueName={centerName}
                  placeholder="담당 센터를 선택해주세요"
                  onSelect={c => { setCenterId(c.id); setCenterName(c.name) }}
                />
              </Field>
              {accountType === 'patient' && (
                <>
                  <Field label="국적">
                    <select
                      className={`${inputCls} appearance-none`}
                      value={nationality}
                      onChange={e => setNationality(e.target.value as Nationality)}
                    >
                      {NATIONALITIES.map(n => (
                        <option key={n} value={n}>{labels.nationality[n]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="비자">
                    <select
                      className={`${inputCls} appearance-none`}
                      value={visaType}
                      onChange={e => setVisaType(e.target.value as VisaType)}
                    >
                      {VISA_TYPES.map(v => (
                        <option key={v} value={v}>{labels.visa[v]}</option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 5: 완료 */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[calc(100vh-66px-113px)] pb-8">
            <CompletionMark />
            <p className="text-[24px] font-semibold text-[#161616] mt-8">가입이 완료되었습니다</p>
          </div>
        )}
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      {showBottomBar && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 flex gap-2.5 bg-white">
          <button
            type="button"
            onClick={prev}
            className="w-[110px] h-[60px] bg-[#F3F9FF] rounded-lg text-[#2592FF] text-[18px] font-semibold shrink-0 hover:bg-[#e6f2ff] transition-colors"
          >
            이전
          </button>
          <button
            type="button"
            onClick={isLastFormStep ? handleSubmit : next}
            disabled={loading}
            className="flex-1 h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            {isLastFormStep ? (loading ? '가입 중...' : '가입 완료하기') : '다음으로'}
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            시작하기
          </button>
        </div>
      )}

      {/* ── Exit Modal ─────────────────────────────────────────────────────── */}
      {showExitModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowExitModal(false) }}
        >
          <div className="bg-white rounded-[20px] p-6 w-full max-w-[370px] flex flex-col gap-8 relative">
            {/* X button on modal */}
            <button
              type="button"
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center"
            >
              <CloseIcon />
            </button>

            <div className="flex flex-col gap-2.5 pt-2">
              <p className="text-[24px] font-semibold text-[#161616] text-center">가입을 멈추고 나갈까요?</p>
              <p className="text-[18px] font-medium text-[#494949] text-center">입력 중인 내용은 모두 초기화돼요</p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 h-[60px] bg-[#F0F1F5] rounded-lg text-[#808080] text-[18px] font-semibold hover:bg-[#e4e4e8] transition-colors"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false)
                  router.replace(step === 5 ? '/dashboard' : '/')
                }}
                className="flex-1 h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] transition-colors"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
