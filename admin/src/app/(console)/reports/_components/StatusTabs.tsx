import PillTabs from '@/components/ui/PillTabs'

export type ReportTab = 'pending' | 'all' | 'rejected'

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'pending',  label: '승인 필요' },
  { value: 'all',      label: '전체' },
  { value: 'rejected', label: '반려' },
]

/** Figma: 보고서 › Toolbar › Status Tabs */
export default function StatusTabs({ value, onChange }: { value: ReportTab; onChange: (tab: ReportTab) => void }) {
  return <PillTabs tabs={TABS} value={value} onChange={onChange} label="보고서 상태" />
}
