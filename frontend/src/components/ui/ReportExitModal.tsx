'use client'

import { useTranslation } from '@/lib/i18n/I18nContext'

interface Props {
  onStay: () => void
  onLeave: () => void
}

export default function ReportExitModal({ onStay, onLeave }: Props) {
  const { t } = useTranslation()
  const tc = t.report_flow

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={e => { if (e.target === e.currentTarget) onStay() }}
    >
      <div className="bg-white rounded-[20px] p-6 w-full max-w-[370px] flex flex-col gap-8 relative">
        <button
          type="button"
          onClick={onStay}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center"
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="#161616" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-col gap-2.5 pt-2">
          <p className="text-[24px] font-semibold text-[#161616] text-center">{tc.exit_modal_title}</p>
          <p className="text-[18px] font-medium text-[#494949] text-center">{tc.exit_modal_desc}</p>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 h-[60px] bg-[#F0F1F5] rounded-lg text-[#808080] text-[18px] font-semibold hover:bg-[#e4e4e8] transition-colors"
          >
            {tc.exit_stay}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] transition-colors"
          >
            {tc.exit_leave}
          </button>
        </div>
      </div>
    </div>
  )
}
