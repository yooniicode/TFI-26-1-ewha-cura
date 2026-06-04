'use client'

import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm w-full text-center py-10">
        <p className="text-2xl mb-3">🔐</p>
        <h2 className="font-bold text-lg mb-2">비밀번호 변경</h2>
        <p className="text-sm text-gray-500 mb-6">
          비밀번호는 마이페이지에서 변경할 수 있습니다.
        </p>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => router.push('/mypage')}
        >
          마이페이지로 이동
        </button>
        <button
          type="button"
          className="mt-2 text-sm text-gray-500 hover:underline w-full"
          onClick={() => router.push('/login')}
        >
          로그인으로 돌아가기
        </button>
      </div>
    </div>
  )
}
