'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Spinner from '@/components/Spinner'
import SearchBox from '@/components/filters/SearchBox'
import ActionButton from '@/components/ui/ActionButton'
import { Modal, ModalButton, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useDebounced } from '@/hooks/useDebounced'
import { useMe } from '@/hooks/useMe'
import { settingsApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/queryKeys'
import type { Member } from '@/lib/schemas'

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin:       { label: '센터 관리자', className: 'bg-status-sky-bg text-status-sky' },
  interpreter: { label: '통번역가',   className: 'bg-status-teal-bg text-status-teal' },
}

const cell = 'shrink-0 truncate text-center'

/** 환경설정 › 센터 직원 — 소속 계정과 권한(센터 관리자 지정 · 해제) */
export default function MembersPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<Member | null>(null)
  const [error, setError] = useState('')
  const query = useDebounced(search, 300)

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.settings.members(query),
    queryFn: () => settingsApi.members(query).then(r => r.payload ?? []),
  })

  const nextRole = target?.role === 'admin' ? 'interpreter' : 'admin'
  const change = useMutation({
    mutationFn: () => settingsApi.updateMemberRole(target!.authUserId, nextRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'members'] })
      toast('권한 변경 완료', `${target?.name ?? '구성원'}님을 ${nextRole === 'admin' ? '센터 관리자로 지정했어요' : '통번역가로 바꿨어요'}`)
      setTarget(null)
    },
    onError: e => setError(e instanceof ApiError && e.message ? e.message : '권한을 바꾸지 못했어요. 다시 시도해주세요.'),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-10 items-center justify-between">
        <p className="text-[14px] font-medium text-ink-grey2">
          센터 관리자로 지정하면 관리자 콘솔에 로그인할 수 있어요. 본인 권한은 바꿀 수 없어요.
        </p>
        <SearchBox value={search} onChange={setSearch} placeholder="이름 · 연락처 검색" />
      </div>

      <div className="w-full overflow-hidden rounded-[14px] border border-line bg-white">
        <div className="flex h-11 items-center justify-between bg-brand-blue-bg px-6 py-[14px] text-[13px] font-semibold text-ink-grey2">
          <span className="w-[140px] shrink-0">이름</span>
          <span className={`${cell} w-[120px]`}>역할</span>
          <span className={`${cell} w-[150px]`}>연락처</span>
          <span className={`${cell} w-[240px]`}>이메일</span>
          <span className={`${cell} w-[90px]`}>계정 상태</span>
          <span className={`${cell} w-[120px]`}>권한</span>
        </div>

        {isLoading ? (
          <Spinner />
        ) : isError || members.length === 0 ? (
          <p className="py-16 text-center text-[16px] font-medium text-brand-blue">
            {isError ? '구성원을 불러오지 못했어요' : query ? '조건에 맞는 구성원이 없어요' : '아직 등록된 구성원이 없어요'}
          </p>
        ) : (
          <ul>
            {members.map(m => {
              const role = m.role ? ROLE_BADGE[m.role] : null
              const isMe = m.authUserId === me?.authUserId
              return (
                <li key={m.authUserId} className="flex h-16 items-center justify-between px-6 py-[14px] text-[14px]">
                  <span className="flex w-[140px] shrink-0 items-center gap-1.5 truncate font-semibold text-table-name">
                    {m.name ?? '-'}
                    {isMe && <span className="text-[12px] font-medium text-brand-blue">나</span>}
                  </span>
                  <span className="flex w-[120px] shrink-0 justify-center">
                    {role && (
                      <span className={clsx('inline-flex h-7 items-center rounded-[12px] px-[10px] text-[14px] font-semibold', role.className)}>
                        {role.label}
                      </span>
                    )}
                  </span>
                  <span className={`${cell} w-[150px] text-ink-grey`}>{m.phone || '-'}</span>
                  <span className={`${cell} w-[240px] text-ink-grey`} title={m.email ?? undefined}>{m.email || '-'}</span>
                  <span className={clsx(cell, 'w-[90px]', m.active === false ? 'text-ink-grey2' : 'text-ink-grey')}>
                    {m.active === false ? '비활성' : '활성'}
                  </span>
                  <span className="flex w-[120px] shrink-0 justify-center">
                    {!isMe && (m.role === 'admin' || m.interpreterId) && (
                      <ActionButton
                        variant={m.role === 'admin' ? 'soft' : 'primary'}
                        onClick={() => { setError(''); setTarget(m) }}
                      >
                        {m.role === 'admin' ? '관리자 해제' : '관리자 지정'}
                      </ActionButton>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {target && (
        <Modal onClose={() => setTarget(null)} labelledBy="role-change-title">
          <ModalHeader
            id="role-change-title"
            title={nextRole === 'admin'
              ? `${target.name ?? '구성원'}님을 센터 관리자로 지정할까요?`
              : `${target.name ?? '구성원'}님의 관리자 권한을 해제할까요?`}
            subtitle={nextRole === 'admin'
              ? '관리자 콘솔에서 매칭 · 보고서 승인 · 개인정보 조회를 할 수 있게 돼요'
              : '관리자 콘솔에 더 이상 로그인할 수 없고, 통번역가 계정으로 돌아가요'}
            onClose={() => setTarget(null)}
          />
          {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
          <ModalFooter>
            <ModalButton onClick={() => setTarget(null)}>아니요</ModalButton>
            <ModalButton
              variant={nextRole === 'admin' ? 'primary' : 'danger'}
              disabled={change.isPending}
              onClick={() => change.mutate()}
            >
              {nextRole === 'admin' ? '네, 지정할게요' : '네, 해제할게요'}
            </ModalButton>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
