import PageHeader from '@/components/PageHeader'
import PillTabs from '@/components/ui/PillTabs'

export type SettingsTab = 'center' | 'members' | 'sheets' | 'account'

export const SETTINGS_TABS: { value: SettingsTab; label: string; href: string }[] = [
  { value: 'center',  label: '센터 정보',     href: '/settings/center' },
  { value: 'members', label: '센터 직원',     href: '/settings/members' },
  { value: 'sheets',  label: '구글 시트 연동', href: '/settings/sheets' },
  { value: 'account', label: '내 계정',       href: '/settings/account' },
]

/** 환경설정 공통 틀 — Figma 시안이 없어 보고서 관리의 알약 탭 · 공통 헤더를 따라 구성 */
export default function SettingsFrame({ current, children }: { current: SettingsTab; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="환경설정" subtitle="센터 정보와 직원 권한, 데이터 연동을 관리해요" />
      <PillTabs tabs={SETTINGS_TABS} value={current} label="환경설정 메뉴" />
      {children}
    </div>
  )
}
