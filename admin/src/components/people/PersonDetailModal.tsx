'use client'

import clsx from 'clsx'
import Spinner from '@/components/Spinner'
import { Modal } from '@/components/ui/Modal'

export interface DetailField {
  label: string
  /** 글자 또는 아이콘이 붙은 노드 */
  value: React.ReactNode
}

/** 각 행의 열 너비 — Figma: 160 / 192 / 나머지 */
const COLUMN_CLASS = ['w-[160px] shrink-0', 'w-[192px] shrink-0', 'min-w-0 flex-1']

/** Figma: 이주민 관리 · 통번역가 관리 › Modal - 상세정보 */
export default function PersonDetailModal({ title, badge, rows, historyTitle, history, loading, emptyHistory, onClose }: {
  title: string
  badge: React.ReactNode
  /** 3열씩 2행 */
  rows: DetailField[][]
  historyTitle: string
  history: string[]
  loading: boolean
  emptyHistory: string
  onClose: () => void
}) {
  return (
    <Modal onClose={onClose} labelledBy="person-detail-title" className="gap-8 p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-1">
          <h2 id="person-detail-title" className="text-[19px] font-semibold text-modal-title">{title}</h2>
          {badge}
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0 rounded-[6px] hover:bg-surface-muted">
          <img src="/icons/close-24.svg" alt="" width={24} height={24} />
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <dl className="flex flex-col gap-[14px]">
            {rows.map((row, ri) => (
              <div key={ri} className="flex items-start gap-6">
                {row.map((field, ci) => (
                  <div key={field.label} className={clsx('flex flex-col gap-1', COLUMN_CLASS[ci])}>
                    <dt className="text-[12px] font-medium text-modal-label">{field.label}</dt>
                    <dd className="truncate text-[14px] font-semibold text-modal-value">{field.value}</dd>
                  </div>
                ))}
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-[10px]">
            <h3 className="text-[16px] font-semibold text-modal-title">{historyTitle}</h3>
            <div className="max-h-[204px] overflow-y-auto rounded-[14px] border border-line p-1">
              {history.length === 0 ? (
                <p className="px-4 py-[10px] text-[13px] text-ink-grey2">{emptyHistory}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {history.map((text, i) => (
                    <li
                      key={i}
                      className={clsx(
                        'rounded-[8px] px-4 py-[10px] text-[13px] text-period-input-text',
                        i === 0 ? 'bg-brand-blue-bg' : 'bg-white',
                      )}
                    >
                      {text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </Modal>
  )
}
