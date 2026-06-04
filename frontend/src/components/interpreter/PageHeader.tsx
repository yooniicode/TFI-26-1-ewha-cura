'use client'

import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  onBack?: () => void
  showClose?: boolean
  onClose?: () => void
}

export default function PageHeader({ title, onBack, showClose = false, onClose }: PageHeaderProps) {
  const router = useRouter()

  function handleBack() {
    if (onBack) onBack()
    else router.back()
  }

  function handleClose() {
    if (onClose) onClose()
    else router.back()
  }

  return (
    <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
      <button
        onClick={handleBack}
        className="w-6 flex items-center justify-center text-gray-400"
        aria-label="뒤로"
      >
        <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
          <path d="M10 2L2 10L10 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">{title}</h1>
      {showClose ? (
        <button
          onClick={handleClose}
          className="w-6 flex items-center justify-center"
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <div className="w-6" />
      )}
    </div>
  )
}
