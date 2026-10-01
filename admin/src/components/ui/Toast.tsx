'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastTone = 'success' | 'danger'

interface ToastMessage {
  id: number
  title: string
  message: string
  tone: ToastTone
}

const TONE_CLASS: Record<ToastTone, { box: string; title: string }> = {
  success: { box: 'bg-toast-bg', title: 'text-brand-green' },
  danger:  { box: 'bg-toast-danger', title: 'text-danger-text' },
}

const ToastContext = createContext<(title: string, message: string, tone?: ToastTone) => void>(() => {})

const TOAST_DURATION_MS = 3000

/** Figma: 매칭관리 › 4) 배정 완료 토스트 — 3초 동안 떠오르고 사라짐 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback((title: string, message: string, tone: ToastTone = 'success') => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), title, message, tone })
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[112px] z-[60] flex justify-center">
        {toast && (
          <div
            key={toast.id}
            role="status"
            className={`flex h-[84px] min-w-[389px] animate-toast flex-col items-center justify-center gap-1 whitespace-nowrap rounded-[20px] px-[30px] py-5 shadow-toast ${TONE_CLASS[toast.tone].box}`}
          >
            <p className={`text-[16px] font-semibold ${TONE_CLASS[toast.tone].title}`}>{toast.title}</p>
            <p className="text-[18px] font-medium text-ink">{toast.message}</p>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
