'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, clearAuthState } from '@/lib/auth/auth-token'
import type { AuthMe } from '@/lib/types'

interface AuthGateOverlaysProps {
  me?: AuthMe | null
  pathname: string
}

export default function AuthGateOverlays({ me, pathname }: AuthGateOverlaysProps) {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      clearAuthState()
      router.replace('/')
      return
    }
    // 이주민(patient) 역할인데 아직 프로필(Patient row)이 없는 경우 → 회원가입 미완료 상태.
    // 그대로 두면 patient 전용 API(공지사항/채팅 등)가 계속 PATIENT_NOT_FOUND로 실패한다.
    if (me && me.role === 'patient' && !me.entityId && pathname !== '/signup') {
      router.replace('/signup')
    }
  }, [router, me, pathname])

  return null
}
