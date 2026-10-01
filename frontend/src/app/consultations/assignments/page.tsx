'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/layout/AppShell'
import Spinner from '@/components/ui/Spinner'
import PageHeader from '@/components/ui/PageHeader'
import { getFlagSrc } from '@/components/patient/PatientInfoBar'
import PatientAvatar from '@/components/patient/PatientAvatar'
import { consultationApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Assignment } from '@/lib/schemas'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { formatKoreanDateTime } from '@/lib/utils/dateFormat'

/** 센터장이 나에게 배정한 진료 요청 — 수락하면 내 일정에, 거절하면 센터에서 재배정 */
export default function AssignmentsPage() {
  const { t } = useTranslation()
  const ta = t.assignment
  const queryClient = useQueryClient()
  const [declining, setDeclining] = useState<Assignment | null>(null)
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null)

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: queryKeys.consultations.assignments(),
    queryFn: () => consultationApi.assignments().then(r => r.payload ?? []),
  })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.consultations.assignments() })
    queryClient.invalidateQueries({ queryKey: ['consultations', 'list'] })
  }

  const accept = useMutation({
    mutationFn: (id: string) => consultationApi.acceptAssignment(id),
    onSuccess: () => { refresh(); setNotice({ text: ta.accepted, tone: 'ok' }) },
    onError: () => setNotice({ text: ta.err, tone: 'error' }),
  })

  const decline = useMutation({
    mutationFn: (id: string) => consultationApi.declineAssignment(id),
    onSuccess: () => { refresh(); setDeclining(null); setNotice({ text: ta.declined, tone: 'ok' }) },
    onError: () => { setDeclining(null); setNotice({ text: ta.err, tone: 'error' }) },
  })

  const busy = accept.isPending || decline.isPending

  return (
    <AppShell noPadding>
      <PageHeader title={ta.title} />

      <div className="bg-white px-4 pt-7 pb-5">
        <h2 className="text-[24px] font-semibold text-[#161616] leading-[1.4] mb-2 whitespace-pre-line">{ta.heading}</h2>
        <p className="text-sm text-[#808080]">{ta.desc}</p>
      </div>

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen space-y-3" style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        {notice && (
          <p
            role="status"
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              notice.tone === 'ok' ? 'bg-[#F6FFF3] text-[#1F8A00]' : 'bg-[#FFECEC] text-[#E72D2D]'
            }`}
          >
            {notice.text}
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#A0A0A0]">{ta.empty}</p>
          </div>
        ) : (
          assignments.map(a => {
            const flagSrc = getFlagSrc(a.patientNationality)
            const place = [a.hospitalName, a.department].filter(Boolean).join(' ')
            return (
              <article key={a.id} className="bg-white rounded-2xl px-4 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <PatientAvatar avatarUrl={a.patientAvatarUrl} gender={a.patientGender} size="md" />
                    {flagSrc && (
                      <Image src={flagSrc} alt="" width={14} height={14} className="absolute -bottom-0.5 -right-0.5" />
                    )}
                  </div>
                  <p className="text-base font-semibold text-[#161616] truncate">{a.patientName}</p>
                </div>

                <dl className="bg-[#F3F9FF] rounded-xl px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-[64px] shrink-0 text-[#808080]">{ta.date}</dt>
                    <dd className="font-medium text-[#161616]">{formatKoreanDateTime(a.consultationDate)}</dd>
                  </div>
                  {place && (
                    <div className="flex gap-3">
                      <dt className="w-[64px] shrink-0 text-[#808080]">{ta.place}</dt>
                      <dd className="font-medium text-[#161616]">{place}</dd>
                    </div>
                  )}
                </dl>

                <p className={`text-sm whitespace-pre-line ${a.patientComment ? 'text-[#494949]' : 'text-[#A0A0A0]'}`}>
                  {a.patientComment || ta.no_comment}
                </p>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setNotice(null); setDeclining(a) }}
                    disabled={busy}
                    className="w-[100px] h-[52px] bg-[#F0F1F5] rounded-2xl text-base font-semibold text-[#494949] hover:bg-[#e4e4e8] disabled:opacity-40 transition-colors"
                  >
                    {ta.decline}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNotice(null); accept.mutate(a.id) }}
                    disabled={busy}
                    className="flex-1 h-[52px] bg-[#2592FF] rounded-2xl text-base font-bold text-white hover:bg-[#1a7ee6] disabled:opacity-40 transition-colors"
                  >
                    {ta.accept}
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>

      {declining && (
        <DeclineSheet
          title={ta.decline_title}
          description={ta.decline_desc}
          cancelLabel={ta.cancel}
          confirmLabel={ta.decline_confirm}
          busy={decline.isPending}
          onCancel={() => setDeclining(null)}
          onConfirm={() => decline.mutate(declining.id)}
        />
      )}
    </AppShell>
  )
}

/** 거절 확인 바텀시트 — Esc · 바깥 탭으로 닫히고, 열리면 "취소"에 포커스 */
function DeclineSheet({ title, description, cancelLabel, confirmLabel, busy, onCancel, onConfirm }: {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [busy, onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-title"
        className="w-full max-w-[402px] bg-white rounded-t-[24px] px-5 pt-6 space-y-5"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="space-y-1.5">
          <h3 id="decline-title" className="text-lg font-semibold text-[#161616]">{title}</h3>
          <p className="text-sm text-[#808080]">{description}</p>
        </div>
        <div className="flex gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-[100px] h-[56px] bg-[#F0F1F5] rounded-2xl text-base font-semibold text-[#494949]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 h-[56px] bg-[#FFE5E5] rounded-2xl text-base font-bold text-[#E72D2D] disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
