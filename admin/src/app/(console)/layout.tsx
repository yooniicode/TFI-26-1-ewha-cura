'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ToastProvider } from '@/components/ui/Toast'
import { useMe } from '@/hooks/useMe'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { authApi } from '@/lib/api'
import { clearAuthState } from '@/lib/auth/auth-token'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: me, isLoading, isError } = useMe()
  const isAdmin = me?.role === 'admin'
  // Figma: 대시보드만 펼친 사이드바, 표 중심 화면(매칭 관리 등)은 아이콘형(베리언트2).
  // 1440(Figma 기준 폭) 미만에서는 대시보드도 접는다.
  const pathname = usePathname()
  const narrow = useMediaQuery('(max-width: 1439px)')
  const collapsed = narrow || pathname !== '/'

  // 관리자 외 계정(또는 만료된 세션)은 세션을 정리하고 로그인으로 보낸다.
  // 네트워크 오류는 세션 문제가 아니므로 로그아웃시키지 않는다.
  useEffect(() => {
    if (isLoading || isError || isAdmin) return
    if (me) authApi.logout().catch(() => {})
    clearAuthState()
    router.replace('/login')
  }, [isLoading, isError, isAdmin, me, router])

  async function handleLogout() {
    try {
      await authApi.logout()
    } finally {
      clearAuthState()
      queryClient.clear()
      router.replace('/login')
    }
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center text-[14px] text-ink-grey2">
        서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.
      </div>
    )
  }

  if (!me || !isAdmin) {
    return <div className="flex h-screen items-center justify-center"><Spinner /></div>
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen min-w-[1280px] bg-white">
        <Sidebar accountName={me.nickname || me.name || '관리자'} onLogout={handleLogout} collapsed={collapsed} />
        <main className="min-w-0 flex-1 p-10">{children}</main>
      </div>
    </ToastProvider>
  )
}
