'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { centerApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useTranslation } from '@/lib/i18n/I18nContext'

export default function CentersPage() {
  const { t } = useTranslation()

  const { data: centers = [], isLoading } = useQuery({
    queryKey: queryKeys.centers,
    queryFn: () => centerApi.list().then(r => r.payload ?? []),
  })

  // IA 미포함: 센터 목록/관리 전용 페이지는 IA에 없음.
  // 센터 생성·수정은 /mypage(admin)에서 처리. 이 페이지는 내비에도 없음.
  // 생성/수정 폼 주석처리, 목록은 읽기 전용으로 유지.

  if (isLoading) return <AppShell noPadding><div className="flex justify-center pt-20"><Spinner /></div></AppShell>

  return (
    <AppShell noPadding>
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6]">
        <h1 className="text-base font-semibold text-[#424242]">{t.center.title}</h1>
        {t.center.subtitle && <p className="text-xs text-[#808080] mt-0.5">{t.center.subtitle}</p>}
      </div>

      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
        {centers.length === 0 ? (
          <EmptyState message={t.center.empty} />
        ) : (
          <div className="space-y-3">
            {centers.map(center => (
              <div key={center.id} className="bg-white rounded-xl px-4 py-4">
                <p className="text-base font-semibold text-[#161616]">{center.name}</p>
                {center.address && <p className="text-sm text-[#808080] mt-0.5">{center.address}</p>}
                {center.phone && <p className="text-sm text-[#808080]">{center.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
