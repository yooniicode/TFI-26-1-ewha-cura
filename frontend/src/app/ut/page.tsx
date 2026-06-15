'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAccessToken } from '@/lib/auth/auth-token'
import { startRecording } from '@/lib/ut-recording'
import Image from 'next/image'
import CuraSpinner from '@/components/ui/CuraSpinner'

function UtSession() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role') as 'patient' | 'interpreter' | null
  const [error, setError] = useState('')

  useEffect(() => {
    if (role !== 'patient' && role !== 'interpreter') return

    async function start() {
      try {
        await startRecording(role!)
        const res = await fetch(`/api/ut-login?role=${role}`)
        const data = await res.json() as { token?: string; error?: string }
        if (data.error) throw new Error(data.error)
        setAccessToken(data.token!)
        router.replace('/dashboard')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'UT 로그인 실패')
      }
    }

    start()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (role !== 'patient' && role !== 'interpreter') {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 gap-4 max-w-[402px] mx-auto">
        <Image src="/icons/cura.svg" alt="Cura" width={40} height={40} />
        <p className="text-[#161616] font-semibold text-base text-center">UT 로그인 오류</p>
        <p className="text-red-500 text-sm text-center">
          role 파라미터가 없거나 잘못되었습니다.<br />
          <code className="bg-red-50 px-1 rounded">?role=patient</code> 또는{' '}
          <code className="bg-red-50 px-1 rounded">?role=interpreter</code>
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center px-6 gap-4 max-w-[402px] mx-auto">
        <Image src="/icons/cura.svg" alt="Cura" width={40} height={40} />
        <p className="text-[#161616] font-semibold text-base text-center">UT 로그인 실패</p>
        <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-3 w-full">{error}</p>
      </div>
    )
  }

  return <CuraSpinner />
}

export default function UtPage() {
  return (
    <Suspense fallback={<CuraSpinner />}>
      <UtSession />
    </Suspense>
  )
}
