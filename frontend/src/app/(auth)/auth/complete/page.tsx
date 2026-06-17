'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { getAccessToken, clearAccessToken } from '@/lib/auth/auth-token'
import CenterSearchSelect from '@/components/center/CenterSearchSelect'
import type { Gender, Nationality, UserRole, VisaType } from '@/lib/types'
import { GENDERS, NATIONALITIES, VISA_TYPES, useEnumLabels } from '@/lib/i18n/enumLabels'

type ProfileRole = Extract<UserRole, 'interpreter' | 'patient'>
type LocalStep = 1 | 2 | 3

function ChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18L9 12L15 6" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

export default function AuthCompletePage() {
  const router = useRouter()
  const labels = useEnumLabels()

  const [checking, setChecking] = useState(true)
  const [localStep, setLocalStep] = useState<LocalStep>(1)

  const [role, setRole] = useState<ProfileRole | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState<Nationality | ''>('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [visaType, setVisaType] = useState<VisaType | ''>('')
  const [birthDate, setBirthDate] = useState('')
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
          setChecking(false)
        }
      })
      .catch(async e => {
        if (e instanceof ApiError && e.isUnauthorized) {
          clearAccessToken()
          router.replace('/login')
        }
      })
  }, [router])

  function handleNext() {
    setError('')
    if (localStep === 1) {
      if (!role) { setError('가입 유형을 선택해주세요.'); return }
      setLocalStep(2)
    } else if (localStep === 2) {
      if (!name.trim()) { setError('이름을 입력해주세요.'); return }
      if (role === 'patient' && !phone.trim()) { setError('연락처를 입력해주세요.'); return }
      if (!centerId && !centerName.trim()) { setError('센터를 선택해주세요.'); return }
      handleSubmit()
    }
  }

  function handlePrev() {
    setError('')
    if (localStep === 2) setLocalStep(1)
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      await authApi.registerProfile({
        name: name.trim(),
        role: role!,
        phone: phone.trim() || undefined,
        nationality: role === 'patient' ? (nationality || 'OTHER') as Nationality : undefined,
        gender: role === 'patient' ? (gender || 'OTHER') as Gender : undefined,
        visaType: role === 'patient' ? (visaType || 'OTHER') as VisaType : undefined,
        interpreterRole: role === 'interpreter' ? 'ACTIVIST' : undefined,
        centerId: centerId || undefined,
        centerName: centerName.trim() || undefined,
      })
      setLocalStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#2592FF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const showBottomBar = localStep === 1 || localStep === 2

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[402px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 h-[66px] shrink-0">
        {localStep === 2 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="w-6 h-6 flex items-center justify-center"
          >
            <ChevronLeft />
          </button>
        ) : (
          <div className="w-6 h-6 opacity-0 pointer-events-none"><ChevronLeft /></div>
        )}
        <span className="text-[18px] font-semibold text-[#161616] tracking-[-0.5px]">회원가입</span>
        <div className="w-6" />
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Step 1: 유형 선택 */}
        {localStep === 1 && (
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
                  onClick={() => setRole('patient')}
                  className={`flex-1 h-[176px] rounded-[20px] border p-5 flex flex-col gap-5 transition-all ${
                    role === 'patient'
                      ? 'border-[#2592FF] bg-[#F3F9FF]'
                      : 'border-[#EEEEEE] bg-white'
                  }`}
                >
                  <img src="/icons/signup/migrant.svg" alt="" width={60} height={60} />
                  <div className="text-left flex flex-col gap-1">
                    <p className="text-[16px] font-semibold text-[#2592FF]">이주민</p>
                    <p className="text-[16px] font-medium text-[#161616] leading-[1.4]">
                      내 진료 기록을<br />확인하고 싶어요
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('interpreter')}
                  className={`flex-1 h-[176px] rounded-[20px] border p-5 flex flex-col gap-5 transition-all ${
                    role === 'interpreter'
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

        {/* Step 2: 기본 정보 */}
        {localStep === 2 && (
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

              {role === 'patient' && (
                <Field label="연락처">
                  <input
                    type="tel"
                    className={inputCls}
                    placeholder="전화번호를 입력해주세요"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </Field>
              )}

              <Field label={role === 'interpreter' ? '근무 센터' : '담당 센터'}>
                <CenterSearchSelect
                  valueName={centerName}
                  placeholder={role === 'interpreter' ? '근무하시는 센터를 선택해주세요' : '담당 센터를 선택해주세요'}
                  onSelect={c => { setCenterId(c.id); setCenterName(c.name) }}
                  buttonClassName={centerBtnCls}
                  valueClassName={centerValueCls}
                  placeholderClassName={centerPlaceholderCls}
                  rightIcon={<SearchIcon />}
                />
              </Field>

              {role === 'patient' && (
                <>
                  <Field label="성별">
                    <select
                      className={`${inputCls} appearance-none ${!gender ? 'text-[#808080]' : 'text-[#161616]'}`}
                      value={gender}
                      onChange={e => setGender(e.target.value as Gender | '')}
                    >
                      <option value="" disabled>성별을 선택해주세요</option>
                      {GENDERS.map(g => (
                        <option key={g} value={g}>{labels.gender[g]}</option>
                      ))}
                    </select>
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
                </>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {localStep === 3 && (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[calc(100vh-179px)]">
            <img src="/icons/common/completion-graphic.svg" width={172} height={172} alt="" className="mx-auto" />
            <p className="text-[24px] font-semibold text-[#161616] mt-8">가입이 완료되었습니다</p>
          </div>
        )}
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      {showBottomBar && (
        <div className="border-t border-[#EEEEEE] px-6 pt-6 pb-8 shrink-0 flex gap-[10px] bg-white">
          <button
            type="button"
            onClick={handlePrev}
            className={`w-[110px] h-[60px] bg-[#F3F9FF] rounded-[8px] text-[#2592FF] text-[18px] font-semibold shrink-0 transition-colors ${
              localStep === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-[#e6f2ff]'
            }`}
          >
            이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="flex-1 h-[60px] bg-[#2592FF] rounded-[8px] text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            {localStep === 2
              ? (loading ? '가입 중...' : '가입 완료하기')
              : '다음으로'}
          </button>
        </div>
      )}

      {/* ── 완료 화면 시작하기 버튼 ────────────────────────────────────────── */}
      {localStep === 3 && (
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
    </div>
  )
}
