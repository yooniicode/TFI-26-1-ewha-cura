import { z } from 'zod'
import { del, get, patch, post, put } from './client'
import {
  authMeSchema,
  calendarDaySchema,
  adminProfileSchema,
  centerProfileSchema,
  memberSchema,
  sheetLinkSchema,
  dashboardOverviewSchema,
  interpreterCandidateSchema,
  interpreterConsultationSchema,
  interpreterDetailSchema,
  interpreterItemSchema,
  patientConsultationSchema,
  patientDetailSchema,
  patientItemSchema,
  matchingRequestSchema,
  reportDetailSchema,
  reportItemSchema,
  type MatchingDisplayStatus,
  type ReportStatus,
} from '../schemas'

export const authApi = {
  login:  (body: { email: string; password: string }) => post<unknown>('/auth/login', body),
  logout: () => post<void>('/auth/logout', {}),
  me:     () => get('/auth/me', authMeSchema),
}

export const adminApi = {
  /** AD-홈 현황판 */
  dashboard: () => get('/admin/dashboard', dashboardOverviewSchema),
  /** AD-06-4 일정 캘린더 — from/to: YYYY-MM-DD */
  calendar: (from: string, to: string) =>
    get(`/admin/matching/calendar?from=${from}&to=${to}`, z.array(calendarDaySchema)),
}

export interface MatchingRequestFilter {
  page: number
  statuses: MatchingDisplayStatus[]
  languages: string[]
  query: string
}

export const matchingApi = {
  /** AD-06-1 요청 목록 — 최신 요청순, 한 페이지 9건 */
  requests: ({ page, statuses, languages, query }: MatchingRequestFilter) => {
    const params = new URLSearchParams({ page: String(page), size: '9' })
    statuses.forEach(s => params.append('status', s))
    languages.forEach(l => params.append('language', l))
    if (query.trim()) params.set('query', query.trim())
    return get(`/admin/matching/requests?${params.toString()}`, z.array(matchingRequestSchema))
  },
  /** AD-06-2 배정 후보 — 언어 일치 → 이 환자와 동행 많은 순 */
  candidates: (consultationId: string) =>
    get(`/admin/matching/candidates?consultationId=${consultationId}`, z.array(interpreterCandidateSchema)),
  assign: (consultationId: string, interpreterId: string) =>
    post(`/admin/matching/requests/${consultationId}/assign`, { interpreterId }, matchingRequestSchema),
  /** 배정 취소 → 재배정 필요 */
  unassign: (consultationId: string) =>
    del(`/admin/matching/requests/${consultationId}/assign`, matchingRequestSchema),
}

export interface ReportFilter {
  page: number
  statuses: ReportStatus[]
  languages: string[]
  query: string
  /** YYYY-MM-DD, 없으면 전체 기간 */
  from?: string
  to?: string
}

export const reportApi = {
  /** AD-보고서 목록 — 진료일 최신순, 한 페이지 6건 */
  list: ({ page, statuses, languages, query, from, to }: ReportFilter) => {
    const params = new URLSearchParams({ page: String(page), size: '6' })
    statuses.forEach(s => params.append('status', s))
    languages.forEach(l => params.append('language', l))
    if (query.trim()) params.set('query', query.trim())
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return get(`/admin/reports?${params.toString()}`, z.array(reportItemSchema))
  },
  detail: (consultationId: string) => get(`/admin/reports/${consultationId}`, reportDetailSchema),
  approve: (consultationId: string) =>
    patch(`/admin/reports/${consultationId}/approve`, {}, reportItemSchema),
  reject: (consultationId: string, reason: string) =>
    patch(`/admin/reports/${consultationId}/reject`, { reason }, reportItemSchema),
}

export interface PeopleFilter {
  page: number
  query: string
  languages: string[]
  genders: string[]
}

/** 카드 그리드 4×4 */
const PEOPLE_PAGE_SIZE = '16'

function peopleParams({ page, query, languages, genders }: PeopleFilter) {
  const params = new URLSearchParams({ page: String(page), size: PEOPLE_PAGE_SIZE })
  if (query.trim()) params.set('query', query.trim())
  languages.forEach(l => params.append('language', l))
  genders.forEach(g => params.append('gender', g))
  return params.toString()
}

export const patientApi = {
  list: (filter: PeopleFilter) =>
    get(`/admin/patients?${peopleParams(filter)}`, z.array(patientItemSchema)),
  detail: (patientId: string) => get(`/admin/patients/${patientId}`, patientDetailSchema),
  consultations: (patientId: string) =>
    get(`/admin/patients/${patientId}/consultations?page=0&size=50`, z.array(patientConsultationSchema)),
}

export const interpreterApi = {
  list: (filter: PeopleFilter) =>
    get(`/admin/interpreters?${peopleParams(filter)}`, z.array(interpreterItemSchema)),
  detail: (interpreterId: string) => get(`/admin/interpreters/${interpreterId}`, interpreterDetailSchema),
  consultations: (interpreterId: string) =>
    get(`/admin/interpreters/${interpreterId}/consultations?page=0&size=50`, z.array(interpreterConsultationSchema)),
}

export const settingsApi = {
  /** 내 센터 기본정보 */
  center: () => get('/admin/center', centerProfileSchema),
  updateCenter: (body: { name: string; address?: string; phone?: string }) =>
    put('/admin/center', body),
  /** 구글 시트 내보내기 연결 정보 */
  sheet: () => get('/admin/center/sheet', sheetLinkSchema),
  /** 기본은 실명 · 생년월일 · 사업장 마스킹 */
  exportSheet: (unmasked: boolean) =>
    post(`/admin/center/sheet/export?unmasked=${unmasked}`, {}, sheetLinkSchema),
  members: (query: string) =>
    get(`/admin/members${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ''}`, z.array(memberSchema)),
  updateMemberRole: (authUserId: string, role: 'admin' | 'interpreter') =>
    patch(`/admin/members/${authUserId}/role`, { role }, memberSchema),
  profile: () => get('/admin/profile', adminProfileSchema),
  updateProfile: (nickname: string) => put('/admin/profile', { nickname }, adminProfileSchema),
}

