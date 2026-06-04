import { get, patch, post, del } from './client'
import { schemas } from '../schemas'
import type { InterpreterRole, Nationality, Gender, VisaType, UserRole, RegisterProfileRequest, UpdateMemberRoleRequest } from '../types'

// ─── 자체 JWT 인증 ──────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  password: string
  name: string
  role: UserRole
  nationality?: Nationality
  gender?: Gender
  visaType?: VisaType
  visaNote?: string
  phone?: string
  region?: string
  interpreterRole?: InterpreterRole
  centerId?: string
  centerName?: string
  languages?: string[]
  availabilityNote?: string
}

export interface TokenMe {
  token: string
  me: {
    authUserId: string
    role: UserRole
    name: string | null
    entityId: string | null
    centerId: string | null
    centerName: string | null
    nickname: string | null
  }
}

// ─── API ────────────────────────────────────────────────────────────────────────

export const authApi = {
  login:           (body: LoginRequest) => post<TokenMe>('/auth/login', body),
  signup:          (body: SignupRequest) => post<TokenMe>('/auth/signup', body),
  changePassword:  (body: { currentPassword: string; newPassword: string }) =>
    post<void>('/auth/change-password', body),
  me:              () => get('/auth/me', schemas.authMe),
  emailExists:     (email: string) => get(`/auth/email-exists?email=${encodeURIComponent(email)}`, schemas.emailExists),
  completeSignup:  () => Promise.resolve({ payload: undefined, isSuccess: true, statusCode: 200, message: 'ok' }),
  deleteAccount:   () => del<void>('/auth/me'),
  registerProfile: (body: RegisterProfileRequest) => post<void>('/auth/register-profile', body),
  bootstrapAdmin:  (secretCode: string, centerName?: string) =>
    post('/auth/bootstrap-admin', { secretCode, centerName }, schemas.authMe),
  members:         () => get('/auth/members', schemas.members),
  updateMemberRole: (authUserId: string, body: UpdateMemberRoleRequest) =>
    patch(`/auth/members/${authUserId}/role`, body, schemas.member),
}
