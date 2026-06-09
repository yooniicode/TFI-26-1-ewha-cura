'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'
import Image from 'next/image'

function UtAutoLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role')
  const [error, setError] = useState('')

  useEffect(() => {
    if (role !== 'patient' && role !== 'interpreter') {
      setError('role 파라미터가 없거나 잘못되었습니다. (?role=patient 또는 ?role=interpreter)')
      return
    }

    fetch(`/api/ut-login?role=${role}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setAccessToken(data.token)
        router.replace('/dashboard')
      })
      .catch(e => setError(e.message ?? 'UT 로그인 실패'))
  }, [role, router])

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 gap-4">
        <Image src="/icons/cura.svg" alt="Cura" width={40} height={40} />
        <p className="text-[#161616] font-semibold text-base text-center">UT 로그인 오류</p>
        <p className="text-red-500 text-sm text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
      <Image src="/icons/cura.svg" alt="Cura" width={40} height={40} />
      <p className="text-[#161616] font-semibold text-base">UT 세션 시작 중...</p>
      <div className="w-6 h-6 border-2 border-[#2592FF] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function UtPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-4">
        <Image src="/icons/cura.svg" alt="Cura" width={40} height={40} />
        <div className="w-6 h-6 border-2 border-[#2592FF] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UtAutoLogin />
    </Suspense>
  )
}
