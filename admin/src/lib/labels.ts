import type { MatchingDisplayStatus, ReportStatus } from './schemas'
import type { StatusBadgeStatus } from '@/components/ui/StatusBadge'

/** 요청 언어 코드(Nationality.languageCode) → 한국어 이름. 드롭다운 순서도 이 순서를 따른다. */
export const LANGUAGE_LABELS: Record<string, string> = {
  zh: '중국어',
  id: '인도네시아어',
  en: '영어',
  th: '태국어',
  ne: '네팔어',
  vi: '베트남어',
  mn: '몽골어',
  km: '캄보디아어',
  my: '미얀마어',
  fil: '필리핀어',
  uz: '우즈베크어',
  si: '싱할라어',
  bn: '벵골어',
  ur: '우르두어',
}

/** 툴바 언어 필터 옵션 */
export const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }))

export function languageLabel(code?: string | null) {
  return code ? LANGUAGE_LABELS[code] ?? code : '-'
}

const NATIONALITY_LABELS: Record<string, string> = {
  KOREA: '한국', UNITED_STATES: '미국', VIETNAM: '베트남', CHINA: '중국', CAMBODIA: '캄보디아',
  MYANMAR: '미얀마', PHILIPPINES: '필리핀', INDONESIA: '인도네시아', THAILAND: '태국', NEPAL: '네팔',
  MONGOLIA: '몽골', UZBEKISTAN: '우즈베키스탄', SRI_LANKA: '스리랑카', BANGLADESH: '방글라데시',
  PAKISTAN: '파키스탄', OTHER: '기타',
}

export function nationalityLabel(value?: string | null) {
  return value ? NATIONALITY_LABELS[value] ?? value : '-'
}

/** Nationality enum → 언어 코드 (백엔드 Nationality.languageCode 와 동일) */
const NATIONALITY_LANGUAGE: Record<string, string> = {
  KOREA: 'ko', UNITED_STATES: 'en', VIETNAM: 'vi', CHINA: 'zh', CAMBODIA: 'km', MYANMAR: 'my',
  PHILIPPINES: 'fil', INDONESIA: 'id', THAILAND: 'th', NEPAL: 'ne', MONGOLIA: 'mn', UZBEKISTAN: 'uz',
  SRI_LANKA: 'si', BANGLADESH: 'bn', PAKISTAN: 'ur', OTHER: 'en',
}

export function nationalityLanguageCode(value?: string | null) {
  return value ? NATIONALITY_LANGUAGE[value] ?? null : null
}

/** 국적 → 국기 (Figma: flag 모음, ISO 3166-1 코드). 기타(OTHER)는 국기 없이 이름만 */
const NATIONALITY_FLAG_CODES: Record<string, string> = {
  KOREA: 'kr', UNITED_STATES: 'us', VIETNAM: 'vn', CHINA: 'cn', CAMBODIA: 'kh', MYANMAR: 'mm',
  PHILIPPINES: 'ph', INDONESIA: 'id', THAILAND: 'th', NEPAL: 'np', MONGOLIA: 'mn', UZBEKISTAN: 'uz',
  SRI_LANKA: 'lk', BANGLADESH: 'bd', PAKISTAN: 'pk',
}

const NATIONALITY_FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(NATIONALITY_FLAG_CODES).map(([nationality, code]) => [nationality, `/icons/flags/${code}.svg`]),
)

export function nationalityFlag(value?: string | null) {
  return value ? NATIONALITY_FLAGS[value] ?? null : null
}

const VISA_LABELS: Record<string, string> = {
  E9: 'E-9 (비전문취업)', E6: 'E-6 (예술흥행)', F1: 'F-1 (방문동거)', F2: 'F-2 (거주)',
  F4: 'F-4 (재외동포)', F5: 'F-5 (영주)', F6: 'F-6 (결혼이민)', H2: 'H-2 (방문취업)',
  D2: 'D-2 (유학)', U: '미등록', OTHER: '기타',
}

export function visaLabel(value?: string | null) {
  return value ? VISA_LABELS[value] ?? value : '-'
}

const GENDER_LABELS: Record<string, string> = { MALE: '남성', FEMALE: '여성', OTHER: '기타' }

export const GENDER_ICONS: Record<string, string> = {
  MALE: '/icons/gender-male.svg',
  FEMALE: '/icons/gender-female.svg',
}

/** 툴바 성별 필터 옵션 */
export const GENDER_OPTIONS = [
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
]

export function genderLabel(value?: string | null) {
  return value ? GENDER_LABELS[value] ?? value : '-'
}

/** 백엔드 화면 상태 → 상태 뱃지. 툴바 상태 드롭다운도 이 순서를 따른다(Figma 1-3). */
export const DISPLAY_STATUS_BADGE: Record<MatchingDisplayStatus, StatusBadgeStatus> = {
  NEEDS_REASSIGNMENT:  'needs_reassignment',
  NEEDS_ASSIGNMENT:    'needs_assignment',
  ASSIGNED:            'assigned',
  AWAITING_ACCEPTANCE: 'awaiting_acceptance',
  COMPLETED:           'completed',
}

export const DISPLAY_STATUS_LABELS: Record<MatchingDisplayStatus, string> = {
  NEEDS_REASSIGNMENT:  '재배정 필요',
  NEEDS_ASSIGNMENT:    '배정 필요',
  ASSIGNED:            '배정 완료',
  AWAITING_ACCEPTANCE: '수락 대기',
  COMPLETED:           '진료 완료',
}

export const REPORT_STATUS_BADGE: Record<ReportStatus, StatusBadgeStatus> = {
  DRAFT:    'report_pending',
  PENDING:  'report_pending',
  APPROVED: 'report_approved',
  REJECTED: 'report_rejected',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026-07-27 09:20 */
export function formatDateTime(iso?: string | null) {
  if (!iso) return '-'
  return iso.slice(0, 16).replace('T', ' ')
}

/** 2026-09-09 (수) 13:15 — 날짜(YYYY-MM-DD)와 선택적 시각(HH:mm) */
export function formatDateWithWeekday(date?: string | null, time?: string | null) {
  if (!date) return '-'
  const d = new Date(`${date.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${date.slice(0, 10)} (${weekday})${time ? ` ${time.slice(0, 5)}` : ''}`
}

/** 2026-07-27 (월) 오전 9:20 */
export function formatDateTimeLong(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  const hour = d.getHours()
  const ampm = hour < 12 ? '오전' : '오후'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} (${weekday}) ${ampm} ${h12}:${pad(d.getMinutes())}`
}
