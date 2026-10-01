'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { clearAuthState, markAuthenticated } from '@/lib/auth/auth-token'
import { queryKeys } from '@/lib/queryKeys'

export default function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      await authApi.login({ email: email.trim(), password })
      markAuthenticated()
      const me = await authApi.me().then(r => r.payload)
      if (me?.role !== 'admin') {
        await authApi.logout().catch(() => {})
        clearAuthState()
        setError('센터 관리자 계정만 로그인할 수 있어요.')
        return
      }
      queryClient.setQueryData(queryKeys.me, me)
      router.replace('/')
    } catch (err) {
      clearAuthState()
      setError(err instanceof ApiError && err.message ? err.message : '로그인에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-sidebar px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-[400px] flex-col gap-5 rounded-[20px] bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-2">
          <img src="/icons/logo.svg" alt="Cura" width={100} height={54.33} />
          <h1 className="text-[20px] font-semibold text-ink-grey">관리자 로그인</h1>
        </div>

        <label className="flex flex-col gap-1.5 text-[14px] font-medium text-ink">
          이메일
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-12 rounded-[12px] bg-surface-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[14px] font-medium text-ink">
          비밀번호
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 rounded-[12px] bg-surface-card px-4 text-[14px] outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </label>

        {error && <p role="alert" className="text-[13px] text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="h-12 rounded-[12px] bg-brand-blue text-[15px] font-semibold text-white transition-colors hover:bg-[#1a7ee6] disabled:opacity-40"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </main>
  )
}
