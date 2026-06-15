'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken, clearAccessToken } from '@/lib/auth/auth-token'
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
    const token = getAccessToken()
    if (!token) {
      router.replace('/login')
    }
  }, [router])

  async function handleLogout() {
    clearAccessToken()
    router.replace('/')
    router.refresh()
  }

  const needsProfile = !!me && me.role !== 'admin' && !me.entityId && !pathname.startsWith('/auth/')

  return (
    <>
      {needsProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-10">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-lg mb-1">Cura</p>
            <h2 className="text-base font-bold mb-2">{t.auth_complete.profile_title}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {t.auth_complete.profile_subtitle_patient}
            </p>
            <button onClick={() => router.push('/auth/complete')} className="btn-primary w-full">
              {t.auth_complete.start}
            </button>
            <button type="button" onClick={handleLogout} className="btn-secondary w-full mt-2">
              {t.auth.logout}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
