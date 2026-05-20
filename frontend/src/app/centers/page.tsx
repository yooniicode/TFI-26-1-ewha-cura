'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
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

  if (isLoading) return <AppShell><Spinner /></AppShell>

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-bold">{t.center.title}</h1>
          <p className="text-xs text-gray-500 mt-1">{t.center.subtitle}</p>
        </div>

        {/* IA 미포함: 센터 생성·수정 폼 — /mypage에서 관리
        <form onSubmit={e => { e.preventDefault(); saveCenter() }} className="card space-y-3">
          <h2 className="font-semibold text-sm">{editing ? t.center.form_edit : t.center.form_create}</h2>
          <div>
            <label className="label">{t.center.name_label}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t.center.name_placeholder} />
          </div>
          <div>
            <label className="label">{t.center.address_label}</label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.center.phone_label}</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t.center.phone_placeholder} />
          </div>
          {error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : t.center.err_save}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setName(''); setAddress(''); setPhone('') }}>
              {t.center.reset}
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
        */}

        {centers.length === 0 ? (
          <EmptyState message={t.center.empty} />
        ) : (
          <div className="space-y-2">
            {centers.map(center => (
              <div key={center.id} className="card">
                <p className="text-sm font-semibold">{center.name}</p>
                {center.address && <p className="text-xs text-gray-400 mt-1">{center.address}</p>}
                {center.phone && <p className="text-xs text-gray-400">{center.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
