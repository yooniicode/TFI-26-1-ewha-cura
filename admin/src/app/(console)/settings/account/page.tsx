'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, ReadField, TextField } from '@/components/ui/Form'
import { ModalButton } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useMe } from '@/hooks/useMe'
import { authApi, settingsApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { clearAuthState } from '@/lib/auth/auth-token'
import { queryKeys } from '@/lib/queryKeys'

/** 환경설정 › 내 계정 — 사이드바에 보이는 닉네임 · 로그아웃 */
export default function AccountPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: me } = useMe()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const { data: profile } = useQuery({
    queryKey: queryKeys.settings.profile,
    queryFn: () => settingsApi.profile().then(r => r.payload ?? null),
  })

  useEffect(() => { setNickname(profile?.nickname ?? '') }, [profile])

  const save = useMutation({
    mutationFn: () => settingsApi.updateProfile(nickname.trim()),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile })
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      toast('저장 완료', '닉네임을 바꿨어요')
    },
    onError: e => setError(e instanceof ApiError && e.message ? e.message : '저장하지 못했어요. 다시 시도해주세요.'),
  })

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearAuthState()
      queryClient.clear()
      router.replace('/login')
    }
  }

  const dirty = nickname.trim() !== (profile?.nickname ?? '') && nickname.trim() !== ''

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-5">
      <Card title="프로필" description="사이드바와 보고서 승인 기록에 보이는 이름이에요">
        <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); if (dirty) save.mutate() }}>
          <div className="grid grid-cols-2 gap-6">
            <ReadField label="이름" value={me?.name || '-'} />
            <ReadField label="소속 센터" value={profile?.centerName || me?.centerName || '-'} />
          </div>
          <TextField
            label="닉네임"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="예: 링크센터 김담당"
            maxLength={30}
          />
          {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
          <div className="flex justify-end">
            <ModalButton type="submit" variant="primary" disabled={!dirty || save.isPending}>저장하기</ModalButton>
          </div>
        </form>
      </Card>

      <Card title="로그인" description="공용 PC에서는 사용 후 꼭 로그아웃해주세요">
        <ModalButton variant="danger" onClick={logout}>로그아웃</ModalButton>
      </Card>
    </div>
  )
}
