'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Modal, ModalButton, ModalFooter, ModalHeader } from '@/components/ui/Modal'

/** Figma: 보고서 › 3) 반려모달 — 사유를 적어야 반려 버튼이 활성화된다 */
export default function RejectModal({ busy, error, onClose, onSubmit }: {
  busy: boolean
  error: string
  onClose: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const filled = reason.trim().length > 0

  return (
    <Modal onClose={onClose} labelledBy="reject-report-title">
      <ModalHeader
        id="reject-report-title"
        title="이 보고서를 반려할까요?"
        subtitle="반려하려면 사유를 입력해주세요. 반려 내용은 작성한 통번역가에게 알림으로 전달됩니다."
        onClose={onClose}
      />
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="반려 사유를 적어주세요"
        aria-label="반려 사유"
        rows={2}
        maxLength={1000}
        className={clsx(
          'min-h-[68px] w-full resize-none rounded-[8px] border bg-white px-[14px] py-[10px] text-[16px] font-medium text-ink outline-none placeholder:text-ink-grey2 [field-sizing:content]',
          filled ? 'border-line-grey2' : 'border-line',
        )}
      />
      {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
      <ModalFooter>
        <ModalButton onClick={onClose}>아니요</ModalButton>
        <ModalButton variant="danger" disabled={!filled || busy} onClick={() => onSubmit(reason.trim())}>
          네, 반려할게요
        </ModalButton>
      </ModalFooter>
    </Modal>
  )
}
