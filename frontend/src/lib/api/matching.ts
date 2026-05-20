import { get, post, del } from './client'
import { schemas } from '../schemas'

export const matchApi = {
  list:      (page = 0) => get(`/matching?page=${page}&size=20`, schemas.matches),
  create:    (body: unknown) => post('/matching', body, schemas.match),
  byPatient: (patientId: string) => get(`/matching/patient/${patientId}`, schemas.match),
  remove:    (id: string) => del<void>(`/matching/${id}`),
  myMatch:   () => get('/matching/me', schemas.match),
  myCount:   () => get('/matching/my-count', schemas.interpreterAssignedCount),
  selfAssign: (patientId: string) => post(`/matching/self/${patientId}`, undefined, schemas.match),
}
