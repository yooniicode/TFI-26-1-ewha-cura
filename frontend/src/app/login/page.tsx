'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { setAccessToken } from '@/lib/auth-token'
import PasswordInput from '@/components/ui/PasswordInput'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('이메일을 입력해주세요.'); return }
    if (!password) { setError('비밀번호를 입력해주세요.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login({ email: email.trim(), password })
      if (res.payload?.token) {
        setAccessToken(res.payload.token)
        router.replace('/dashboard')
      }
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

      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-8">
        <h1 className="text-[28px] font-semibold text-[#161616] leading-[1.4] mb-[52px]">
          이미 만든 계정으로<br />로그인 해주세요
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[16px] font-medium text-[#494949]">이메일 주소</label>
              <input
                type="email"
                className="w-full border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[18px] text-[#161616] outline-none placeholder:text-[#808080] focus:border-[#2592FF] bg-white transition-colors"
                placeholder="이메일 주소를 입력해주세요"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2.5">
              <label className="text-[16px] font-medium text-[#494949]">비밀번호</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="비밀번호를 8자리 이상 입력해주세요"
                autoComplete="current-password"
                className="w-full border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[18px] text-[#161616] outline-none placeholder:text-[#808080] focus:border-[#2592FF] bg-white transition-colors"
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
      </div>
    </div>
  )
}
