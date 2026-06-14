'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { setAccessToken } from '@/lib/auth-token'
import PasswordInput from '@/components/ui/PasswordInput'

type Method = 'email' | 'phone'

const inputCls =
  'w-full border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[18px] text-[#161616] outline-none placeholder:text-[#808080] focus:border-[#2592FF] bg-white transition-colors'

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>('email')

  // 이메일 로그인
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 전화번호 로그인
  const [pfPhone, setPfPhone] = useState('')
  const [pfCode, setPfCode] = useState('')
  const [pfReceiveNum, setPfReceiveNum] = useState('')
  const [pfCodeSent, setPfCodeSent] = useState(false)
  const [pfReqLoading, setPfReqLoading] = useState(false)
  const [pfVerifyLoading, setPfVerifyLoading] = useState(false)
  const [pfNoAccount, setPfNoAccount] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    if (!password) { setError('비밀번호를 입력해주세요.'); return }
    setLoading(true); setError('')
    try {
      const res = await authApi.login({ email: email.trim(), password })
      if (res.payload?.token) { setAccessToken(res.payload.token); router.replace('/dashboard') }
    } catch (e) {
      if (e instanceof ApiError && e.isNotFound) {
        setError('가입되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.')
      } else {
        setError(e instanceof Error ? e.message : '이메일 또는 비밀번호가 올바르지 않습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePfRequest() {
    if (!pfPhone.trim()) return
    setPfReqLoading(true); setError(''); setPfNoAccount(false)
    try {
      const res = await authApi.phoneRequest(pfPhone.trim())
      if (res.payload) { setPfCode(res.payload.code); setPfReceiveNum(res.payload.receiveNumber); setPfCodeSent(true) }
    } catch (e) {
      setError(e instanceof Error ? e.message : '코드 발급에 실패했습니다.')
    } finally {
      setPfReqLoading(false)
    }
  }

  async function handlePfVerify() {
    setPfVerifyLoading(true); setError(''); setPfNoAccount(false)
    try {
      const res = await authApi.phoneLogin(pfPhone.trim(), pfCode)
      if (!res.payload) throw new Error('응답 오류')
      if (res.payload.exists && res.payload.token) {
        setAccessToken(res.payload.token)
        router.replace('/dashboard')
      } else {
        setPfNoAccount(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증에 실패했습니다. 문자를 보낸 후 다시 시도해주세요.')
    } finally {
      setPfVerifyLoading(false)
    }
  }

  function switchMethod(m: Method) {
    setMethod(m); setError(''); setPfCodeSent(false); setPfCode(''); setPfNoAccount(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[402px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-[66px] shrink-0">
        <button type="button" onClick={() => router.push('/')} className="w-6 h-6 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="#161616" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[18px] font-semibold text-[#161616] tracking-[-0.5px]">로그인</span>
        <div className="w-6" />
      </header>

      {/* Method toggle */}
      <div className="flex mx-4 bg-[#F0F1F5] rounded-xl p-1 gap-1">
        {(['email', 'phone'] as Method[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchMethod(m)}
            className={`flex-1 h-[40px] rounded-lg text-[15px] font-semibold transition-all ${
              method === m ? 'bg-white text-[#161616] shadow-sm' : 'text-[#808080]'
            }`}
          >
            {m === 'email' ? '이메일' : '전화번호'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-8">

        {/* 이메일 로그인 */}
        {method === 'email' && (
          <>
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              이미 만든 계정으로<br />로그인 해주세요
            </h1>
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[16px] font-medium text-[#494949]">이메일 주소</label>
                  <input
                    type="email"
                    className={inputCls}
                    placeholder="이메일 주소를 입력해주세요"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[16px] font-medium text-[#494949]">비밀번호</label>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="비밀번호를 8자리 이상 입력해주세요"
                    autoComplete="current-password"
                    className={inputCls}
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </>
        )}

        {/* 전화번호 로그인 */}
        {method === 'phone' && (
          <>
            <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
              전화번호로<br />로그인 해주세요
            </h1>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2.5">
                <label className="text-[16px] font-medium text-[#494949]">전화번호</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    className={`${inputCls} flex-1`}
                    placeholder="010-0000-0000"
                    value={pfPhone}
                    onChange={e => { setPfPhone(e.target.value); setPfCodeSent(false); setPfCode(''); setPfNoAccount(false) }}
                  />
                  <button
                    type="button"
                    onClick={handlePfRequest}
                    disabled={!pfPhone.trim() || pfReqLoading}
                    className="shrink-0 h-[56px] px-4 bg-[#2592FF] rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors"
                  >
                    {pfReqLoading ? '...' : pfCodeSent ? '재발급' : '인증하기'}
                  </button>
                </div>
              </div>

              {pfCodeSent && (
                <div className="bg-[#F3F9FF] rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-[14px] text-[#494949] text-center">아래 번호로 코드를 문자로 보내주세요</p>
                  <p className="text-[13px] text-[#808080] text-center font-medium">{pfReceiveNum}</p>
                  <div className="bg-white rounded-xl px-4 py-3 text-center border border-[#2592FF]/20">
                    <p className="text-[36px] font-bold text-[#2592FF] tracking-[10px]">{pfCode}</p>
                  </div>
                  <a
                    href={`sms:${pfReceiveNum}?body=${encodeURIComponent(pfCode)}`}
                    className="w-full h-[48px] bg-[#2592FF] rounded-xl text-white text-[15px] font-semibold flex items-center justify-center hover:bg-[#1a7ee6] transition-colors"
                  >
                    문자앱으로 바로 보내기
                  </a>
                  <button
                    type="button"
                    onClick={handlePfVerify}
                    disabled={pfVerifyLoading}
                    className="w-full h-[48px] bg-[#F0F1F5] rounded-xl text-[#494949] text-[15px] font-semibold disabled:opacity-40 hover:bg-[#e4e4e8] transition-colors"
                  >
                    {pfVerifyLoading ? '확인 중...' : '문자 보냈어요, 인증 확인'}
                  </button>
                </div>
              )}

              {pfNoAccount && (
                <div className="bg-[#FFF3F3] rounded-2xl p-4 text-center flex flex-col gap-2">
                  <p className="text-[15px] font-medium text-[#494949]">가입된 계정이 없어요</p>
                  <Link href="/signup" className="text-[#2592FF] text-[14px] font-semibold">
                    전화번호로 회원가입 하기 →
                  </Link>
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
