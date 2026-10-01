'use client'

import { useEffect, useRef } from 'react'
import clsx from 'clsx'

/** Figma: 매칭관리 › Modal 공통 틀 (640px, Overlay 포함) */
export function Modal({ onClose, labelledBy, children, className }: {
  onClose: () => void
  labelledBy: string
  children: React.ReactNode
  /** 패널 여백·간격을 화면별 Figma 값으로 바꿀 때 */
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,15,20,0.5)] p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={clsx(
          'flex max-h-full w-[640px] flex-col overflow-y-auto rounded-[20px] bg-white shadow-modal outline-none',
          className ?? 'gap-6 px-8 pb-7 pt-8',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ id, title, badge, subtitle, onClose }: {
  id: string
  title: string
  badge?: React.ReactNode
  subtitle: string
  onClose: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-3">
          <h2 id={id} className="text-[19px] font-semibold text-modal-title">{title}</h2>
          {badge}
        </div>
        <p className="text-[13px] font-medium text-modal-sub">{subtitle}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0 rounded-[6px] hover:bg-surface-muted">
        <img src="/icons/close-24.svg" alt="" width={24} height={24} />
      </button>
    </div>
  )
}

type ModalButtonVariant = 'secondary' | 'primary' | 'danger'

const MODAL_BUTTON: Record<ModalButtonVariant, string> = {
  secondary: 'border border-line bg-white px-5 text-modal-button hover:bg-surface-muted disabled:opacity-40',
  primary:   'bg-brand-blue px-6 text-white hover:bg-[#1a7ee6] disabled:opacity-40',
  // Figma 보고서 › 3-1 사유 작성 전: 비활성 버튼은 회색
  danger:    'bg-danger-bg px-6 text-danger-text enabled:hover:bg-[#FFD6D6] disabled:bg-button-bluegrey disabled:text-line-grey2',
}

export function ModalButton({ variant = 'secondary', className, type = 'button', ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ModalButtonVariant }) {
  return (
    <button
      type={type}
      className={clsx(
        'flex h-[46px] items-center justify-center rounded-[10px] py-3 text-[14px] font-semibold transition-colors',
        MODAL_BUTTON[variant],
        className,
      )}
      {...props}
    />
  )
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-[10px]">{children}</div>
}
