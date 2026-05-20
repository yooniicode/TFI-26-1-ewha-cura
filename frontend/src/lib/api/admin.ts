import { del, get, post, put } from './client'
import { schemas } from '../schemas'
import type { UpsertAdminWorkLogRequest, UpsertCenterPatientMemoRequest } from '../types'

function workLogPath(page = 0, from?: string, to?: string) {
  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return `/admin/work-logs?${params.toString()}`
}

export const adminApi = {
  stats: () => get('/admin/stats', schemas.adminCenterStats),

  profile: () => get('/admin/profile', schemas.adminProfile),
  updateProfile: (body: { centerId?: string; centerName?: string; nickname?: string }) =>
    put('/admin/profile', body, schemas.adminProfile),

  workLogs: (page = 0, from?: string, to?: string) =>
    get(workLogPath(page, from, to), schemas.adminWorkLogs),
  createWorkLog: (body: UpsertAdminWorkLogRequest) =>
    post('/admin/work-logs', body, schemas.adminWorkLog),
  updateWorkLog: (id: string, body: UpsertAdminWorkLogRequest) =>
    put(`/admin/work-logs/${id}`, body, schemas.adminWorkLog),
  deleteWorkLog: (id: string) => del<void>(`/admin/work-logs/${id}`),

  patientMemos: (patientId: string, page = 0) =>
    get(`/admin/patients/${patientId}/memos?page=${page}&size=20`, schemas.centerPatientMemos),
  createPatientMemo: (patientId: string, body: UpsertCenterPatientMemoRequest) =>
    post(`/admin/patients/${patientId}/memos`, body, schemas.centerPatientMemo),
  updatePatientMemo: (id: string, body: UpsertCenterPatientMemoRequest) =>
    put(`/admin/patient-memos/${id}`, body, schemas.centerPatientMemo),
  deletePatientMemo: (id: string) => del<void>(`/admin/patient-memos/${id}`),
}
