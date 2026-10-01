'use client'

import { useQuery } from '@tanstack/react-query'
import Spinner from '@/components/Spinner'
import StatusBadge from '@/components/ui/StatusBadge'
import { reportApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import {
  REPORT_STATUS_BADGE,
  formatDateTime,
  formatDateWithWeekday,
  genderLabel,
  nationalityLabel,
} from '@/lib/labels'
import type { ReportItem } from '@/lib/schemas'

/** Figma: 보고서 › Detail Panel (620px) — 진료내용 표 + 반려/승인 */
export default function ReportDetailPanel({ item, busy, onApprove, onReject }: {
  item: ReportItem
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: queryKeys.reports.detail(item.consultationId),
    queryFn: () => reportApi.detail(item.consultationId).then(r => r.payload ?? null),
  })

  const place = [detail?.hospitalName ?? item.hospitalName, detail?.department].filter(Boolean).join(' ')
  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: '진료 날짜',        value: formatDateTime(detail?.consultationDate ?? item.consultationDate) },
    { label: '진료 장소',        value: place || '-' },
    { label: '증상 및 내원 계기', value: detail?.patientComment || '-' },
    { label: '의사 진단',        value: detail?.diagnosisContent || '-' },
    { label: '주의사항',         value: detail?.treatmentResult || '-' },
    { label: '약 복용',          value: detail?.medicationInstruction || '-' },
    {
      label: '다음 일정',
      value: formatDateWithWeekday(detail?.nextAppointmentDate, detail?.nextAppointmentTime),
      highlight: true,
    },
  ]

  return (
    <section
      aria-label="보고서 상세"
      className="flex h-full w-[620px] shrink-0 flex-col justify-between gap-6 overflow-hidden rounded-[14px] border border-line bg-white p-7"
    >
      <div className="flex min-h-0 flex-col gap-7 overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-[19px] font-bold text-modal-title">{item.patientName ?? '-'} 님</h2>
          <p className="flex gap-2 text-[14px] font-medium text-ink-grey2">
            <span>{genderLabel(detail?.patientGender)}</span>
            <span>{nationalityLabel(detail?.patientNationality ?? item.patientNationality)}</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Field label="동행 통번역가" value={`${item.interpreterName ?? '-'} 통번역가`} />
          <Field label="작성일시" value={`${formatDateTime(item.reportSubmittedAt ?? item.createdAt)} 작성`} />
          <div className="flex min-w-0 flex-1 items-center gap-[10px]">
            <StatusBadge status={REPORT_STATUS_BADGE[item.reportStatus]} />
            {item.reportStatus === 'REJECTED' && item.reportRejectReason && (
              <p className="min-w-0 flex-1 break-words text-[12px] font-medium text-modal-label">
                {item.reportRejectReason}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[10px]">
          <h3 className="text-[14px] font-semibold text-modal-value">진료내용</h3>
          {isLoading ? (
            <Spinner />
          ) : (
            <dl className="divide-y divide-line-input overflow-hidden rounded-[10px] border border-line">
              {rows.map(row => (
                <div key={row.label} className="flex min-h-[50px]">
                  <dt className={`flex w-[160px] shrink-0 items-center px-4 py-[14px] text-[13px] font-semibold text-ink-grey2 ${row.highlight ? 'bg-brand-blue-bg' : 'bg-surface-muted'}`}>
                    {row.label}
                  </dt>
                  <dd className="flex min-w-0 flex-1 items-center whitespace-pre-wrap break-words px-4 py-[14px] text-[14px] font-medium text-ink-grey">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="flex h-11 shrink-0 items-center justify-end gap-[10px]">
        <button
          type="button"
          onClick={onReject}
          disabled={busy || item.reportStatus === 'REJECTED'}
          className="flex h-11 items-center justify-center rounded-[10px] bg-status-red-bg px-5 py-3 text-[14px] font-semibold text-point-red disabled:opacity-40"
        >
          반려
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || item.reportStatus === 'APPROVED'}
          className="flex h-11 items-center justify-center rounded-[10px] bg-brand-blue px-6 py-3 text-[14px] font-bold text-white hover:bg-[#1a7ee6] disabled:opacity-40"
        >
          승인
        </button>
      </div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-1 whitespace-nowrap">
      <p className="text-[12px] font-medium text-modal-label">{label}</p>
      <p className="text-[14px] font-semibold text-modal-value">{value}</p>
    </div>
  )
}
