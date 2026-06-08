'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { setAccessToken } from '@/lib/auth-token'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <KakaoCallbackInner />
    </Suspense>
  )
}

function KakaoCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const kakaoError = searchParams.get('error')

    if (kakaoError) {
      setError(t.login.err_callback_failed)
      setTimeout(() => router.replace('/login'), 2000)
      return
    }

    if (!code) {
      setError(t.login.err_callback_failed)
      setTimeout(() => router.replace('/login'), 2000)
      return
    }

    const redirectUri = `${window.location.origin}/auth/kakao/callback`
    authApi.kakaoLogin(code, redirectUri)
      .then(res => {
        if (res.payload?.token) {
          setAccessToken(res.payload.token)
          // 프로필 미완성(신규 유저)이면 정보 입력 페이지로
          if (!res.payload.me?.entityId) {
            router.replace('/auth/complete')
          } else {
            router.replace('/dashboard')
          }
        } else {
          setError(t.login.err_auth_unknown)
          setTimeout(() => router.replace('/login'), 2000)
        }
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : t.login.err_auth_unknown)
        setTimeout(() => router.replace('/login'), 3000)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6">
      <div className="bg-white rounded-2xl px-8 py-10 max-w-sm w-full text-center space-y-4 shadow-sm">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[#161616]">{error}</p>
            <p className="text-sm text-[#A0A0A0]">{t.login.back_to_login}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-[#FEE500] flex items-center justify-center mx-auto">
              <svg className="animate-spin w-6 h-6 text-[#3A1D1D]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[#161616]">{t.login.logging_in}</p>
            <p className="text-sm text-[#A0A0A0]">{t.auth_complete.just_a_moment}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#FEE500] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
