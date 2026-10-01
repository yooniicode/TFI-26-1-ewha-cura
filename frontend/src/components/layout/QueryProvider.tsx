'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { clearLegacyToken } from '@/lib/auth/auth-token'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))

  // 구버전에서 localStorage 에 저장하던 JWT 제거 — XSS 로 탈취 가능한 값이라 즉시 정리한다
  useEffect(() => { clearLegacyToken() }, [])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
