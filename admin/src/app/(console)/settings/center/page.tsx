'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '@/components/Spinner'
import { Card, ReadField, TextField } from '@/components/ui/Form'
import { ModalButton } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { settingsApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/queryKeys'

/** 환경설정 › 센터 정보 — 센터명 · 주소 · 연락처 수정 + 센터 현황 */
export default function CenterSettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [error, setError] = useState('')

  const { data: center, isLoading } = useQuery({
    queryKey: queryKeys.settings.center,
    queryFn: () => settingsApi.center().then(r => r.payload ?? null),
  })

  useEffect(() => {
    if (center) setForm({ name: center.name, address: center.address ?? '', phone: center.phone ?? '' })
  }, [center])

  const save = useMutation({
    mutationFn: () => settingsApi.updateCenter({
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
    }),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.center })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      toast('저장 완료', '센터 정보를 저장했어요')
    },
    onError: e => setError(e instanceof ApiError && e.message ? e.message : '저장하지 못했어요. 다시 시도해주세요.'),
  })

  if (isLoading) return <Spinner />
  if (!center) return <p className="text-[14px] text-ink-grey2">센터 정보를 불러오지 못했어요.</p>

  const dirty = form.name !== center.name || form.address !== (center.address ?? '') || form.phone !== (center.phone ?? '')

  return (
    <div className="grid grid-cols-[1fr_360px] items-start gap-5">
      <Card title="기본 정보" description="이주민과 통번역가 앱에 보이는 센터 정보예요">
        <form
          className="flex flex-col gap-5"
          onSubmit={e => { e.preventDefault(); if (form.name.trim()) save.mutate() }}
        >
          <TextField
            label="센터 이름"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            maxLength={100}
          />
          <TextField
            label="주소"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="예: 경남 창원시 성산구 ○○로 12"
          />
          <TextField
            label="연락처"
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="055-000-0000"
          />
          {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
          <div className="flex justify-end gap-[10px]">
            <ModalButton
              disabled={!dirty || save.isPending}
              onClick={() => setForm({ name: center.name, address: center.address ?? '', phone: center.phone ?? '' })}
            >
              되돌리기
            </ModalButton>
            <ModalButton type="submit" variant="primary" disabled={!dirty || !form.name.trim() || save.isPending}>
              저장하기
            </ModalButton>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-5">
          <Stat label="등록 이주민" value={center.patientCount} tone="text-brand-blue" />
          <Stat label="소속 통번역가" value={center.interpreterCount} tone="text-brand-green" />
        </div>
        <Card title="담당 관리자">
          <ReadField label="닉네임" value={center.managerNickname || '-'} />
        </Card>
      </div>
    </div>
  )
}

/** 대시보드 Stat Card 를 작게 줄인 형태 */
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex h-[120px] flex-col justify-between rounded-[20px] bg-surface-card p-5">
      <p className="text-[15px] font-semibold text-ink-grey">{label}</p>
      <p className={`text-[30px] font-semibold ${tone}`}>{value}명</p>
    </div>
  )
}
