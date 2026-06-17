'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken, clearAccessToken } from '@/lib/auth/auth-token'
import type { AuthMe } from '@/lib/types'

interface AuthGateOverlaysProps {
  me?: AuthMe | null
  pathname: string
}

export default function AuthGateOverlays({ me: _me, pathname: _pathname }: AuthGateOverlaysProps) {
  const router = useRouter()

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      clearAccessToken()
      router.replace('/')
    }
  }, [router])

  return null
}
