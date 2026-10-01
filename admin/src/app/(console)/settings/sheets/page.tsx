'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Form'
import { ModalButton } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { settingsApi } from '@/lib/api'
import { ApiError } from '@/lib/api/client'
import { queryKeys } from '@/lib/queryKeys'
import SheetReader from './SheetReader'

/** 환경설정 › 구글 시트 연동 — 보고서 내보내기(백엔드 서비스 계정) + 공개 시트 불러오기 */
export default function SheetsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [unmasked, setUnmasked] = useState(false)
  const [error, setError] = useState('')

  const { data: sheet } = useQuery({
    queryKey: queryKeys.settings.sheet,
    queryFn: () => settingsApi.sheet().then(r => r.payload ?? null),
  })

  const exportSheet = useMutation({
    mutationFn: () => settingsApi.exportSheet(unmasked),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.sheet })
      toast('내보내기 완료', '센터 보고서를 구글 시트로 내보냈어요')
    },
    onError: e => setError(e instanceof ApiError && e.message ? e.message : '내보내지 못했어요. 다시 시도해주세요.'),
  })

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="보고서 내보내기"
        description="센터의 전체 보고서를 센터 전용 구글 시트로 보내요. 처음 내보내면 시트가 새로 만들어져요."
        actions={sheet?.connected && sheet.url ? (
          <a
            href={sheet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 shrink-0 items-center rounded-[8px] bg-brand-blue-bg px-[14px] text-[13px] font-semibold text-brand-blue hover:bg-surface-nav-active"
          >
            시트 열기 ↗
          </a>
        ) : undefined}
      >
        <div className="flex items-center gap-2 text-[14px] font-medium">
          <span className={`size-2 rounded-full ${sheet?.connected ? 'bg-brand-green' : 'bg-line-grey2'}`} />
          <span className={sheet?.connected ? 'text-ink' : 'text-ink-grey2'}>
            {sheet?.connected ? '연결된 시트가 있어요' : '아직 연결된 시트가 없어요'}
          </span>
        </div>

        <label className="flex items-start gap-2 rounded-[12px] bg-surface-muted px-5 py-4">
          <input
            type="checkbox"
            checked={unmasked}
            onChange={e => setUnmasked(e.target.checked)}
            className="mt-0.5 size-4 accent-brand-blue"
          />
          <span className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold text-modal-value">개인정보 원본 포함</span>
            <span className="text-[13px] text-modal-sub">
              기본으로는 실명 · 생년월일 · 사업장을 가려서 보내요. 원본을 포함하면 제3자 제공으로 접속기록에 남아요.
            </span>
          </span>
        </label>

        {error && <p role="alert" className="text-[13px] text-danger-text">{error}</p>}
        <div className="flex justify-end">
          <ModalButton variant="primary" disabled={exportSheet.isPending} onClick={() => exportSheet.mutate()}>
            {exportSheet.isPending ? '내보내는 중...' : '지금 내보내기'}
          </ModalButton>
        </div>
      </Card>

      <Card
        title="시트 불러오기"
        description="링크 공유된 구글 시트를 읽기 전용으로 확인해요"
      >
        <SheetReader />
      </Card>
    </div>
  )
}
