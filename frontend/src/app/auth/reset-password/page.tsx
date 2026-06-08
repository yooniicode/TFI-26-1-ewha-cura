'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm w-full text-center py-10">
        <p className="text-2xl mb-3">🔐</p>
        <h2 className="font-bold text-lg mb-2">{t.mypage.password_change}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t.mypage.password_change}
        </p>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => router.push('/mypage')}
        >
          {t.nav.mypage}
        </button>
        <button
          type="button"
          className="mt-2 text-sm text-gray-500 hover:underline w-full"
          onClick={() => router.push('/login')}
        >
          {t.login.back_to_login}
        </button>
      </div>
    </div>
  )
}
