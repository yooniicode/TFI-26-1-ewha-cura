import { get, post, put, patch } from './client'
import { schemas } from '../schemas'

type ConsultationSortField = 'consultationDate' | 'createdAt' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

type ConsultationListOptions = {
  page?: number
  patientQuery?: string
  sortBy?: ConsultationSortField
  direction?: SortDirection
}

function listPath(options: ConsultationListOptions | number = {}) {
  const opts = typeof options === 'number' ? { page: options } : options
  const params = new URLSearchParams({
    page: String(opts.page ?? 0),
    size: '20',
    sort: `${opts.sortBy ?? 'consultationDate'},${opts.direction ?? 'desc'}`,
  })
  if (opts.patientQuery?.trim()) params.set('patientQuery', opts.patientQuery.trim())
  return `/consultations?${params.toString()}`
}

export const consultationApi = {
  list:      (options: ConsultationListOptions | number = {}) => get(listPath(options), schemas.consultations),
  get:       (id: string) => get(`/consultations/${id}`, schemas.consultation),
  getPatientReport: (id: string) => get(`/consultations/${id}`, schemas.patientReport),
  create:    (body: unknown) => post('/consultations', body, schemas.consultation),
  request:   (body: unknown) => post('/consultations/request', body, schemas.consultation),
  update:    (id: string, body: unknown) => put(`/consultations/${id}`, body, schemas.consultation),
  confirm:   (id: string, body: unknown) => patch(`/consultations/${id}/confirm`, body, schemas.consultation),
  byPatient: (patientId: string, page = 0) =>
    get(`/consultations/patient/${patientId}?page=${page}&size=20`, schemas.consultations),
}
