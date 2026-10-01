'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { TextField } from '@/components/ui/Form'
import { ModalButton } from '@/components/ui/Modal'
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
      {/* 설정 카드와 같은 패널 · 폼 필드 · 모달 버튼으로 구성 */}
      <form onSubmit={handleSubmit} className="flex w-full max-w-[400px] flex-col gap-6 rounded-[20px] border border-line bg-white p-10">
        <div className="flex flex-col gap-3">
          <img src="/icons/logo.svg" alt="Cura" width={103} height={54.33} />
          <div className="flex flex-col gap-1">
            <h1 className="text-[19px] font-semibold text-modal-title">관리자 로그인</h1>
            <p className="text-[13px] font-medium text-modal-sub">센터 관리자 계정으로 로그인해주세요</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TextField
            label="이메일"
            type="email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}

        <ModalButton type="submit" variant="primary" disabled={loading || !email.trim() || !password}>
          {loading ? '로그인 중...' : '로그인'}
        </ModalButton>
      </form>
    </main>
  )
}
