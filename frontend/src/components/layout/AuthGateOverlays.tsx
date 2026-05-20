'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { AuthMe } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/I18nContext'

interface AuthGateOverlaysProps {
  me?: AuthMe | null
  pathname: string
}

export default function AuthGateOverlays({ me, pathname }: AuthGateOverlaysProps) {
  const router = useRouter()
  const { t } = useTranslation()
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      }
    })
  }, [router])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const needsApproval = false
  const needsProfile = !!me && me.role !== 'admin' && !me.entityId && !needsApproval && !pathname.startsWith('/auth/')
  const needsAdminCenter = false

  return (
    <>
      {needsAdminCenter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-lg mb-1">{t.common.admin_center_required}</p>
            <p className="text-sm text-gray-500 mb-5">{t.common.admin_center_required_desc}</p>
            <button
              onClick={() => router.push('/mypage')}
              className="btn-primary w-full"
            >
              {t.common.setup_center}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary w-full mt-2"
            >
              {t.auth.logout}
            </button>
          </div>
        </div>
      )}

      {needsProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-lg mb-1">반갑습니다</p>
            <h2 className="text-base font-bold mb-2">기본 정보를 입력해 주세요</h2>
            <p className="text-sm text-gray-500 mb-5">
              서비스 이용을 위해 이름과 역할 정보를 먼저 등록해 주세요.
            </p>
            <button
              onClick={() => router.push('/auth/complete')}
              className="btn-primary w-full"
            >
              정보 입력하러 가기
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-secondary w-full mt-2"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}

    </>
  )
}
