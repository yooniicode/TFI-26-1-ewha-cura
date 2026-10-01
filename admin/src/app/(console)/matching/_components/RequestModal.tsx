'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StatusBadge from '@/components/ui/StatusBadge'
import { Modal, ModalButton, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { matchingApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/queryKeys'
import {
  DISPLAY_STATUS_BADGE,
  formatDateTime,
  formatDateTimeLong,
  genderLabel,
  languageLabel,
  nationalityLabel,
} from '@/lib/labels'
import type { InterpreterCandidate, MatchingRequest } from '@/lib/schemas'
import CandidateCard from './CandidateCard'
import { needsAssignment } from './RequestTable'

/**
 * Figma: 매칭관리 › 3) 접수 내용 모달
 * - 3-1 배정 필요 · 재배정 필요 → 후보 선택 후 배정하기
 * - 3-2 수락 대기 → 배정 취소 가능
 * - 3-3 배정 완료 · 진료 완료 → 확인만
 */
export default function RequestModal({ request, onClose }: {
  request: MatchingRequest
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [error, setError] = useState('')

  const patientName = request.patientName ?? '환자'
  const assignable = needsAssignment(request)

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: queryKeys.matching.candidates(request.consultationId),
    queryFn: () => matchingApi.candidates(request.consultationId).then(r => r.payload ?? []),
  })

  const assigned = candidates.find(c => c.interpreterId === request.interpreterId)
  const assignedName = assigned?.name ?? request.interpreterName ?? '통번역가'

  function onDone(title: string, message: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.matching.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    onClose()
    toast(title, message)
  }

  function onFail(e: unknown) {
    setError(e instanceof ApiError && e.message ? e.message : '처리하지 못했어요. 다시 시도해주세요.')
  }

  const assign = useMutation({
    mutationFn: (interpreterId: string) => matchingApi.assign(request.consultationId, interpreterId),
    onSuccess: (_, interpreterId) => {
      const name = candidates.find(c => c.interpreterId === interpreterId)?.name ?? '통번역가'
      onDone('배정 완료', `${name} 통번역가님에게 배정 알림을 보냈어요`)
    },
    onError: onFail,
  })

  const unassign = useMutation({
    mutationFn: () => matchingApi.unassign(request.consultationId),
    onSuccess: () => onDone('배정 취소', `${assignedName} 통번역가님의 배정을 취소했어요`),
    onError: onFail,
  })

  if (confirmingCancel) {
    return (
      <Modal onClose={onClose} labelledBy="cancel-assignment-title">
        <ModalHeader
          id="cancel-assignment-title"
          title={`${assignedName} 통번역가의 배정을 취소할까요?`}
          subtitle="취소하면 통번역가에게 알림이 전송되고, 되돌릴 수 없어요"
          onClose={onClose}
        />
        <section className="flex flex-col gap-[10px]">
          <h3 className="text-[16px] font-semibold text-ink">취소될 배정</h3>
          <CandidateCard
            name={assignedName}
            sub={genderLabel(assigned?.gender)}
            note={`${patientName}님 · ${formatDateTime(request.assignedAt)} 배정`}
            selected
          />
        </section>
        {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
        <ModalFooter>
          <ModalButton onClick={() => setConfirmingCancel(false)}>아니요</ModalButton>
          <ModalButton variant="danger" onClick={() => unassign.mutate()} disabled={unassign.isPending}>
            네, 취소할게요
          </ModalButton>
        </ModalFooter>
      </Modal>
    )
  }

  const languageName = languageLabel(request.patientLanguageCode)
  const matchedCandidates = candidates.filter(c => c.languageMatched)

  return (
    <Modal onClose={onClose} labelledBy="request-modal-title">
      <ModalHeader
        id="request-modal-title"
        title={`${patientName} 님의 접수 내용`}
        badge={request.displayStatus && <StatusBadge status={DISPLAY_STATUS_BADGE[request.displayStatus]} />}
        subtitle="환자가 남긴 접수 내용을 확인해 통번역가를 배정해요"
        onClose={onClose}
      />

      <dl className="flex flex-col gap-[18px] rounded-[12px] bg-surface-muted px-5 py-4">
        <div className="flex gap-6">
          <Field label="이름" value={patientName} />
          <Field label="국가" value={nationalityLabel(request.patientNationality)} />
        </div>
        <div className="flex gap-6">
          <Field label="생년월일" value={request.patientBirthDate ?? '-'} />
          <Field label="성별" value={genderLabel(request.patientGender)} />
        </div>
        <div className="flex gap-6">
          <Field label="요청 언어" value={languageName} />
          <Field label="원하는 진료 일시 및 시간" value={formatDateTimeLong(request.consultationDate)} />
        </div>
        <Field label="요청사항" value={request.symptom || '-'} wrap />
      </dl>

      {assignable ? (
        <section className="flex min-h-0 flex-col gap-[10px]">
          <h3 className="text-[16px] font-semibold text-ink">{languageName} 가능 통번역가</h3>
          <div className="h-[227px] overflow-y-auto rounded-[14px] border border-line p-1">
            {isLoading && <p className="p-4 text-[13px] text-ink-grey2">불러오는 중...</p>}
            {!isLoading && matchedCandidates.length === 0 && (
              <p className="p-4 text-[13px] text-ink-grey2">{languageName}가 가능한 통번역가가 없어요.</p>
            )}
            <div className="flex flex-col gap-1">
              {matchedCandidates.map(c => (
                <CandidateCard
                  key={c.interpreterId}
                  name={c.name ?? '-'}
                  sub={genderLabel(c.gender)}
                  note={companionNote(patientName, c)}
                  selected={selectedId === c.interpreterId}
                  onSelect={() => setSelectedId(c.interpreterId)}
                  showSelectedButton
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-[10px]">
          <h3 className="text-[16px] font-semibold text-ink">
            {request.displayStatus === 'AWAITING_ACCEPTANCE'
              ? '통번역가분의 수락을 기다리고 있어요'
              : `${patientName}님과 동행할 통번역가`}
          </h3>
          <CandidateCard
            name={assignedName}
            sub={genderLabel(assigned?.gender)}
            note={request.displayStatus === 'AWAITING_ACCEPTANCE'
              ? companionNote(patientName, assigned)
              : `${patientName}님과 ${(assigned?.companionCount ?? 0) + 1}번째 동행`}
            selected
          />
        </section>
      )}

      {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}

      <ModalFooter>
        <ModalButton onClick={onClose}>닫기</ModalButton>
        {assignable && (
          <ModalButton
            variant="primary"
            disabled={!selectedId || assign.isPending}
            onClick={() => selectedId && assign.mutate(selectedId)}
          >
            배정하기
          </ModalButton>
        )}
        {request.displayStatus === 'AWAITING_ACCEPTANCE' && (
          <ModalButton variant="danger" onClick={() => { setError(''); setConfirmingCancel(true) }}>
            배정 취소
          </ModalButton>
        )}
      </ModalFooter>
    </Modal>
  )
}

function companionNote(patientName: string, candidate?: InterpreterCandidate) {
  const count = candidate?.companionCount ?? 0
  return count > 0 ? `${patientName}님과 ${count}번 동행했어요` : `${patientName}님과 처음 동행해요`
}

function Field({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <dt className="text-[12px] font-medium text-modal-label">{label}</dt>
      <dd className={wrap ? 'whitespace-pre-wrap break-words text-[14px] font-semibold text-modal-value' : 'truncate text-[14px] font-semibold text-modal-value'}>
        {value}
      </dd>
    </div>
  )
}
