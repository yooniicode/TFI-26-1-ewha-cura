'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { authApi } from '@/lib/api'
import { setAccessToken } from '@/lib/auth/auth-token'
import PasswordInput from '@/components/ui/PasswordInput'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import { NATIONALITIES, VISA_TYPES, GENDERS, useEnumLabels } from '@/lib/i18n/enumLabels'
import type { Gender, Nationality, VisaType } from '@/lib/types'

type AccountType = 'patient' | 'interpreter'
type Platform = 'email' | 'phone' | 'kakao'
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 10 | 14

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18L9 12L15 6" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.79 1.88 5.25 4.65 6.65-.15.55-.96 3.32-.99 3.55 0 0-.02.16.09.23.1.07.23.02.23.02.31-.04 3.59-2.35 4.16-2.74A12.5 12.5 0 0 0 12 18.5c5.52 0 10-3.58 10-8s-4.48-8-10-8z" fill="#191600" />
    </svg>
  )
}

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <label className="text-[16px] font-medium text-[#494949]">
        {label}
        {optional && <span className="text-[#999] font-normal text-[14px] ml-1">(선택)</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-[#EEEEEE] rounded-[16px] px-4 py-4 text-[18px] text-[#161616] outline-none placeholder:text-[#808080] focus:border-[#2592FF] bg-white transition-colors'

function SelectWithChevron({
  children,
  placeholder,
  value,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode; placeholder?: string }) {
  const isEmpty = !value || value === ''
  return (
    <div className="relative">
      <select
        className={`${inputCls} appearance-none pr-12 ${isEmpty ? 'text-[#808080]' : 'text-[#161616]'}`}
        value={value}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
      <img
        src="/icons/signup/Arrows/chevron/expand verical.svg"
        width={24}
        height={24}
        alt=""
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
      />
    </div>
  )
}

const centerBtnCls = `${inputCls} flex items-center justify-between`
const centerValueCls = 'truncate text-[#161616]'
const centerPlaceholderCls = 'truncate text-[#808080]'
const SearchIcon = () => (
  <img src="/icons/signup/Essentials/search list.svg" width={24} height={24} alt="" className="shrink-0" />
)

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageInner />
    </Suspense>
  )
}

function SignupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const labels = useEnumLabels()

  const isKakao = searchParams.get('kakao') === '1'
  const kakaoName = searchParams.get('name') ?? ''

  const [platform, setPlatform] = useState<Platform>(isKakao ? 'kakao' : 'email')
  const [step, setStep] = useState<Step>(isKakao ? 2 : 0)
  const [showExitModal, setShowExitModal] = useState(false)

  // 이메일 플로우 필드
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 전화번호 인증 필드
  const [pfPhone, setPfPhone] = useState('')
  const [pfCode, setPfCode] = useState('')
  const [pfReceiveNum, setPfReceiveNum] = useState('')
  const [pfSmsSent, setPfSmsSent] = useState(false)
  const [pfReqLoading, setPfReqLoading] = useState(false)
  const [pfVerifyLoading, setPfVerifyLoading] = useState(false)

  // 공통 프로필 필드
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [name, setName] = useState(isKakao ? kakaoName : '')
  const [gender, setGender] = useState<Gender | ''>('')
  const [phone, setPhone] = useState('')
  const [centerId, setCenterId] = useState('')
  const [centerName, setCenterName] = useState('')
  const [nationality, setNationality] = useState<Nationality | ''>('')
  const [visaType, setVisaType] = useState<VisaType | ''>('')
  const [birthDate, setBirthDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function next() {
    setError('')
    if (step === 1) {
      if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
      if (!password) { setError('비밀번호를 입력해주세요.'); return }
      if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }
      if (password !== confirmPassword) { setError('비밀번호 확인이 일치하지 않습니다.'); return }
      setStep(2); return
    }
    if (step === 2) {
      if (!accountType) { setError('가입 유형을 선택해주세요.'); return }
      setStep(3); return
    }
    if (step === 3) {
      if (!name.trim()) { setError('이름을 입력해주세요.'); return }
      if (accountType === 'patient') {
        if (!phone.trim()) { setError('연락처를 입력해주세요.'); return }
        setStep(4); return
      }
      if (accountType === 'interpreter') {
        if (!centerId && !centerName.trim()) { setError('근무 센터를 선택해주세요.'); return }
        handleSubmit(); return
      }
    }
    if (step === 4) {
      if (!centerId && !centerName.trim()) { setError('담당 센터를 선택해주세요.'); return }
      handleSubmit(); return
    }
  }

  function prev() {
    setError('')
    if (step === 2) {
      if (platform === 'kakao') { router.push('/login'); return }
      if (platform === 'phone') { setStep(14); return }
      setStep(1); return
    }
    if (step === 3) { setStep(2); return }
    if (step === 4) { setStep(3); return }
    if (step === 14) { setStep(10); return }
    if (step === 10) { setStep(0); return }
    if (step === 1) { setStep(0); return }
  }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      if (platform === 'kakao') {
        await authApi.registerProfile({
          name: name.trim(),
          role: accountType!,
          phone: phone.trim() || undefined,
          centerId: centerId || undefined,
          centerName: centerName.trim() || undefined,
          ...(accountType === 'patient' ? {
            nationality: (nationality || 'OTHER') as Nationality,
            gender: (gender || 'OTHER') as Gender,
            visaType: (visaType || 'OTHER') as VisaType,
            birthDate: birthDate || undefined,
          } : {}),
          ...(accountType === 'interpreter' ? { interpreterRole: 'ACTIVIST' as const } : {}),
        })
      } else if (platform === 'phone') {
        const res = await authApi.phoneSignup({
          phone: pfPhone.trim(),
          name: name.trim(),
          role: accountType!,
          centerId: centerId || undefined,
          centerName: centerName.trim() || undefined,
          ...(accountType === 'patient' ? {
            nationality: (nationality || 'OTHER') as Nationality,
            gender: (gender || 'OTHER') as Gender,
            visaType: (visaType || 'OTHER') as VisaType,
            birthDate: birthDate || undefined,
          } : {}),
        })
        if (res.payload?.token) setAccessToken(res.payload.token)
      } else {
        const res = await authApi.signup({
          email: email.trim(),
          password,
          name: name.trim(),
          role: accountType!,
          phone: phone.trim() || undefined,
          centerId: centerId || undefined,
          centerName: centerName.trim() || undefined,
          ...(accountType === 'patient' ? {
            nationality: (nationality || 'OTHER') as Nationality,
            gender: (gender || 'OTHER') as Gender,
            visaType: (visaType || 'OTHER') as VisaType,
            birthDate: birthDate || undefined,
          } : {}),
          ...(accountType === 'interpreter' ? { interpreterRole: 'ACTIVIST' as const } : {}),
        })
        if (res.payload?.token) setAccessToken(res.payload.token)
      }
      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePfRequest() {
    if (!pfPhone.trim()) { setError('전화번호를 입력해주세요.'); return }
    setPfReqLoading(true); setError('')
    try {
      const res = await authApi.phoneRequest(pfPhone.trim())
      if (res.payload) {
        setPfCode(res.payload.code)
        setPfReceiveNum(res.payload.receiveNumber)
        setPfSmsSent(false)
        setStep(14)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '코드 발급에 실패했습니다.')
    } finally {
      setPfReqLoading(false)
    }
  }

  async function handlePfVerify() {
    setPfVerifyLoading(true); setError('')
    try {
      const res = await authApi.phoneLogin(pfPhone.trim(), pfCode)
      if (!res.payload) throw new Error('응답 오류')
      if (res.payload.exists && res.payload.token) {
        setAccessToken(res.payload.token)
        router.replace('/dashboard')
      } else {
        // 신규 유저 → 공통 플로우 진입 (전화번호 pre-fill)
        setPhone(pfPhone.trim())
        setStep(2)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증에 실패했습니다. 문자를 보낸 후 다시 시도해주세요.')
    } finally {
      setPfVerifyLoading(false)
    }
  }

  function handleKakao() {
    const key = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    if (!key) return
    const redirectUri = `${window.location.origin}/auth/kakao/callback`
    const params = new URLSearchParams({ client_id: key, redirect_uri: redirectUri, response_type: 'code' })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  const isLastFormStep =
    step === 4 || (step === 3 && accountType === 'interpreter')

  const showBottomBar = step === 1 || step === 2 || step === 3 || step === 4
  const showCloseBtn = platform === 'email' && (step === 1 || step === 2 || step === 3 || step === 4)
  const showBackBtn = step === 1 || step === 2 || step === 3 || step === 4 || step === 10 || step === 14

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[402px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 h-[66px] shrink-0">
        {showBackBtn ? (
          <button
            type="button"
            onClick={prev}
            className="w-6 h-6 flex items-center justify-center"
          >
            <ChevronLeft />
          </button>
        ) : (
          <div className="w-6 h-6 opacity-0 pointer-events-none"><ChevronLeft /></div>
        )}
        <span className="text-[18px] font-semibold text-[#161616] tracking-[-0.5px]">회원가입</span>
        {showCloseBtn ? (
          <button
            type="button"
            onClick={() => setShowExitModal(true)}
            className="w-6 h-6 flex items-center justify-center"
          >
            <img src="/icons/signup/close.svg" width={24} height={24} alt="닫기" />
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
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => { setError(''); setPlatform('phone'); setPfPhone(''); setPfCode(''); setPfSmsSent(false); setStep(10) }}
                  className="w-full h-[60px] bg-[#f0f1f5] rounded-lg text-[#161616] text-[18px] font-semibold hover:bg-[#e4e5ea] active:bg-[#d8d9de] transition-colors"
                >
                  전화번호로 시작하기
                </button>
                <button
                  type="button"
                  onClick={() => { setError(''); setPlatform('email'); setStep(1) }}
                  className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
                >
                  이메일로 시작하기
                </button>
                <button
                  type="button"
                  onClick={handleKakao}
                  className="w-full h-[60px] bg-[#FFE724] rounded-lg text-[#171502] text-[18px] font-semibold hover:bg-[#f5dc00] active:bg-[#e8d000] transition-colors flex items-center justify-center gap-2"
                >
                  <KakaoIcon />
                  카카오톡으로 시작하기
                </button>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                <span className="text-[16px] font-medium text-[#808080]">계정이 있으신가요?</span>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-[16px] font-medium text-[#2592FF]"
                >
                  로그인
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: 이메일 & 비밀번호 */}
        {step === 1 && (
          <div className="px-4 pt-8 pb-4">
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

        {/* Step 2: 유형 선택 (모든 플랫폼 공통) */}
        {step === 2 && (
          <div className="flex flex-col min-h-[calc(100vh-179px)]">
            <div className="px-4 pt-8">
              <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4]">
                어떤 유형으로<br />가입할까요?
              </h1>
            </div>
            <div className="flex-1 flex items-center px-4">
              <div className="flex gap-[22px] w-full">
                <button
                  type="button"
                  onClick={() => setAccountType('patient')}
                  className={`flex-1 h-[176px] rounded-[20px] border p-5 flex flex-col gap-5 justify-center overflow-hidden transition-all ${
                    accountType === 'patient'
                      ? 'border-[#2592FF] bg-[#F3F9FF]'
                      : 'border-[#EEEEEE] bg-white'
                  }`}
                >
                  <img src="/icons/signup/migrant.svg" alt="" width={60} height={60} />
                  <div className="text-left flex flex-col gap-1">
                    <p className="text-[16px] font-semibold text-[#2592FF]">이주민</p>
                    <p className="text-[16px] font-medium text-[#161616] leading-[1.4]">
                      내 진료 기록을<br />직접 확인하고 싶어요
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('interpreter')}
                  className={`flex-1 h-[176px] rounded-[20px] border p-5 flex flex-col gap-5 justify-center overflow-hidden transition-all ${
                    accountType === 'interpreter'
                      ? 'border-[#30C100] bg-[#F3FFF0]'
                      : 'border-[#EEEEEE] bg-white'
                  }`}
                >
                  <img src="/icons/signup/interpreter.svg" alt="" width={60} height={60} />
                  <div className="text-left flex flex-col gap-1">
                    <p className="text-[16px] font-semibold text-[#30C100]">통번역가</p>
                    <p className="text-[16px] font-medium text-[#161616] leading-[1.4]">
                      진료 동행 기록을<br />작성하고 관리해요
                    </p>
                  </div>
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm px-4 pb-4">{error}</p>}
          </div>
        )}

        {/* Step 3: 기본 정보 (유형별) */}
        {step === 3 && (
          <div className="px-4 pt-8 pb-4">
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
                <>
                  <Field label="성별">
                    <SelectWithChevron
                      value={gender}
                      onChange={e => setGender(e.target.value as Gender | '')}
                      placeholder="성별을 선택해주세요"
                    >
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{labels.gender[g]}</option>
                      ))}
                    </SelectWithChevron>
                  </Field>
                  <Field label="연락처">
                    <input
                      type="tel"
                      className={inputCls}
                      placeholder="전화번호를 입력해주세요"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </Field>
                </>
              )}

              {accountType === 'interpreter' && (
                <>
                  <Field label="연락처">
                    <input
                      type="tel"
                      className={inputCls}
                      placeholder="전화번호를 입력해주세요"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </Field>
                  <Field label="근무 센터">
                    <CenterSearchSelect
                      valueName={centerName}
                      placeholder="근무하시는 센터를 선택해주세요"
                      onSelect={c => { setCenterId(c.id); setCenterName(c.name) }}
                      buttonClassName={centerBtnCls}
                      valueClassName={centerValueCls}
                      placeholderClassName={centerPlaceholderCls}
                      rightIcon={<SearchIcon />}
                    />
                  </Field>
                </>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 4: 이주민 추가 정보 (담당 센터 + 국적 + 비자) */}
        {step === 4 && (
          <div className="px-4 pt-8 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              기본 정보를<br />설정해주세요
            </h1>
            <div className="flex flex-col gap-5">
              <Field label="담당 센터">
                <CenterSearchSelect
                  valueName={centerName}
                  placeholder="담당 센터를 선택해주세요"
                  onSelect={c => { setCenterId(c.id); setCenterName(c.name) }}
                  buttonClassName={centerBtnCls}
                  valueClassName={centerValueCls}
                  placeholderClassName={centerPlaceholderCls}
                  rightIcon={<SearchIcon />}
                />
              </Field>
              <Field label="국적">
                <SelectWithChevron
                  value={nationality}
                  onChange={e => setNationality(e.target.value as Nationality | '')}
                  placeholder="국적을 선택해주세요"
                >
                  {NATIONALITIES.map(n => (
                    <option key={n} value={n}>{labels.nationality[n]}</option>
                  ))}
                </SelectWithChevron>
              </Field>
              <Field label="비자">
                <SelectWithChevron
                  value={visaType}
                  onChange={e => setVisaType(e.target.value as VisaType | '')}
                  placeholder="비자를 선택해주세요"
                >
                  {VISA_TYPES.map(v => (
                    <option key={v} value={v}>{labels.visa[v]}</option>
                  ))}
                </SelectWithChevron>
              </Field>
              <Field label="생년월일" optional>
                <input
                  type="date"
                  className={inputCls}
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </Field>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 5: 가입 완료 */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[calc(100vh-179px)]">
            <img src="/icons/common/completion-graphic.svg" width={172} height={172} alt="" className="mx-auto" />
            <p className="text-[24px] font-semibold text-[#161616] mt-8">가입이 완료되었습니다</p>
          </div>
        )}

        {/* Step 10: 전화번호 입력 */}
        {step === 10 && (
          <div className="px-4 pt-8 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4]">
              안녕하세요<br />의료 소통 플랫폼
            </h1>
            <div className="flex items-center gap-1 mt-1 mb-1">
              <div className="relative w-[116px] h-[40px] shrink-0">
                <Image src="/icons/curawithfont.svg" alt="Cura" fill className="object-contain object-left" />
              </div>
              <span className="text-[28px] font-semibold text-[#161616] leading-[1.4]">입니다</span>
            </div>
            <p className="text-[16px] font-medium text-[#808080] mb-8">번호만 있다면 회원가입이 가능해요</p>
            <div className="flex flex-col gap-[10px]">
              <label className="text-[16px] font-medium text-[#494949]">전화번호</label>
              <input
                type="tel"
                className={inputCls}
                placeholder="휴대폰 전화번호를 입력해주세요"
                value={pfPhone}
                onChange={e => { setPfPhone(e.target.value); setPfCode('') }}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 14: 문자 인증 */}
        {step === 14 && (
          <div className="px-4 pt-8 pb-4">
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-2">
              전화번호를<br />인증합니다
            </h1>
            <p className="text-[16px] font-medium text-[#494949] leading-[1.4] mb-6">
              하단 버튼을 눌러<br />인증 메시지를 수정 없이 그대로 보내주세요.
            </p>
            <div className="flex justify-center">
              <img src="/icons/signup/sms-example.svg" alt="" className="w-full max-w-[370px]" />
            </div>
            <p className="text-[12px] text-[#808080] text-center mt-3">
              이용 중인 통신 요금제에 따라 메시지 발송 비용이 청구될 수 있습니다.
            </p>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </div>
        )}
      </div>

      {/* ── Step 10 하단 버튼 ─────────────────────────────────────────────── */}
      {step === 10 && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 bg-white">
          <button
            type="button"
            onClick={handlePfRequest}
            disabled={!pfPhone.trim() || pfReqLoading}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            {pfReqLoading ? '확인 중...' : '다음으로'}
          </button>
        </div>
      )}

      {/* ── Step 14 하단 버튼 ─────────────────────────────────────────────── */}
      {step === 14 && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 bg-white">
          {!pfSmsSent ? (
            <a
              href={`sms:${pfReceiveNum}?body=${encodeURIComponent(pfCode)}`}
              onClick={() => setPfSmsSent(true)}
              className="flex items-center justify-center w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
            >
              인증 메시지 보내기
            </a>
          ) : (
            <button
              type="button"
              onClick={handlePfVerify}
              disabled={pfVerifyLoading}
              className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
            >
              {pfVerifyLoading ? '확인 중...' : '문자를 보냈어요, 인증 확인'}
            </button>
          )}
        </div>
      )}

      {/* ── Bottom bar (이전 + 다음/완료) ─────────────────────────────────── */}
      {showBottomBar && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 flex gap-[10px] bg-white">
          <button
            type="button"
            onClick={prev}
            className="w-[110px] h-[60px] bg-[#F3F9FF] rounded-[8px] text-[#2592FF] text-[18px] font-semibold shrink-0 hover:bg-[#e6f2ff] transition-colors"
          >
            이전
          </button>
          <button
            type="button"
            onClick={next}
            disabled={loading}
            className="flex-1 h-[60px] bg-[#2592FF] rounded-[8px] text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            {isLastFormStep
              ? (loading ? '가입 중...' : '가입 완료하기')
              : '다음으로'}
          </button>
        </div>
      )}

      {/* ── 완료 화면 시작하기 버튼 ────────────────────────────────────────── */}
      {step === 5 && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="w-full h-[60px] bg-[#2592FF] rounded-[8px] text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            시작하기
          </button>
        </div>
      )}

      {/* ── 나가기 모달 ──────────────────────────────────────────────────── */}
      {showExitModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowExitModal(false) }}
        >
          <div className="bg-white rounded-[20px] p-6 w-[370px] flex flex-col gap-8 relative">
            <button
              type="button"
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center"
            >
              <img src="/icons/signup/close.svg" width={24} height={24} alt="닫기" />
            </button>
            <div className="flex flex-col gap-2.5 pt-2">
              <p className="text-[24px] font-semibold text-[#161616] text-center">가입을 멈추고 나갈까요?</p>
              <p className="text-[18px] font-medium text-[#494949] text-center">입력 중인 내용은 모두 초기화돼요</p>
            </div>
            <div className="flex gap-[10px]">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 h-[60px] bg-[#F0F1F5] rounded-[8px] text-[#808080] text-[18px] font-semibold hover:bg-[#e4e4e8] transition-colors"
              >
                돌아가기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false)
                  router.replace('/')
                }}
                className="flex-1 h-[60px] bg-[#2592FF] rounded-[8px] text-white text-[18px] font-semibold hover:bg-[#1a7ee6] transition-colors"
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
