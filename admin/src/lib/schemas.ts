import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'interpreter', 'patient'])

export const authMeSchema = z.object({
  authUserId: z.string(),
  role:       userRoleSchema.nullable().optional(),
  name:       z.string().nullable().optional(),
  centerId:   z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  nickname:   z.string().nullable().optional(),
  avatarUrl:  z.string().nullable().optional(),
})
export type AuthMe = z.infer<typeof authMeSchema>

// ─── AD-홈 현황판 (AdminDashboardResponse) ───────────────────────────────────────

export const dashboardAlertTypeSchema = z.enum(['REPORT_REJECTED', 'REPORT_OVERDUE', 'REQUEST_UNASSIGNED'])

export const dashboardAlertSchema = z.object({
  type:            z.union([dashboardAlertTypeSchema, z.string()]),
  message:         z.string(),
  consultationId:  z.string().uuid().nullable().optional(),
  patientId:       z.string().uuid().nullable().optional(),
  patientName:     z.string().nullable().optional(),
  interpreterId:   z.string().uuid().nullable().optional(),
  interpreterName: z.string().nullable().optional(),
  occurredAt:      z.string().nullable().optional(),
})
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>

export const dashboardOverviewSchema = z.object({
  centerId:   z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  today: z.object({
    newRequestCount: z.number(),
    unassignedCount: z.number(),
    inProgressCount: z.number(),
  }),
  approval: z.object({
    pendingReportCount:  z.number(),
    rejectedReportCount: z.number(),
  }),
  monthly: z.object({
    year:                   z.number(),
    month:                  z.number(),
    completedCount:         z.number(),
    activeInterpreterCount: z.number(),
    patientCount:           z.number(),
  }),
  alerts: z.array(dashboardAlertSchema),
})
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>

// ─── AD-06-4 매칭 캘린더 (AdminMatchingResponse.CalendarDay) ─────────────────────

export const matchingStatusSchema = z.enum(['PENDING', 'ASSIGNED', 'REJECTED', 'CANCELLED'])

export const calendarItemSchema = z.object({
  consultationId:  z.string().uuid(),
  consultationDate: z.string().nullable().optional(),
  patientId:       z.string().uuid().nullable().optional(),
  patientName:     z.string().nullable().optional(),
  interpreterId:   z.string().uuid().nullable().optional(),
  interpreterName: z.string().nullable().optional(),
  hospitalName:    z.string().nullable().optional(),
  matchingStatus:  matchingStatusSchema.nullable().optional(),
})
export type CalendarItem = z.infer<typeof calendarItemSchema>

export const calendarDaySchema = z.object({
  date:          z.string(),
  totalCount:    z.number(),
  assignedCount: z.number(),
  pendingCount:  z.number(),
  items:         z.array(calendarItemSchema),
})

// ─── AD-06 매칭 관리 (AdminMatchingResponse) ─────────────────────────────────────

export const genderSchema = z.enum(['MALE', 'FEMALE', 'OTHER'])
export type Gender = z.infer<typeof genderSchema>

/** 화면 상태 (MatchingDisplayStatus) */
export const matchingDisplayStatusSchema = z.enum([
  'NEEDS_ASSIGNMENT', 'NEEDS_REASSIGNMENT', 'AWAITING_ACCEPTANCE', 'ASSIGNED', 'COMPLETED',
])
export type MatchingDisplayStatus = z.infer<typeof matchingDisplayStatusSchema>

export const matchingRequestSchema = z.object({
  consultationId:      z.string().uuid(),
  consultationDate:    z.string().nullable().optional(),
  patientId:           z.string().uuid(),
  patientName:         z.string().nullable().optional(),
  patientGender:       z.string().nullable().optional(),
  patientBirthDate:    z.string().nullable().optional(),
  patientNationality:  z.string().nullable().optional(),
  patientLanguageCode: z.string().nullable().optional(),
  symptom:             z.string().nullable().optional(),
  displayStatus:       matchingDisplayStatusSchema.nullable().optional(),
  interpreterId:       z.string().uuid().nullable().optional(),
  interpreterName:     z.string().nullable().optional(),
  assignedAt:          z.string().nullable().optional(),
  requestedAt:         z.string().nullable().optional(),
})
export type MatchingRequest = z.infer<typeof matchingRequestSchema>

export const interpreterCandidateSchema = z.object({
  interpreterId:   z.string().uuid(),
  name:            z.string().nullable().optional(),
  gender:          z.string().nullable().optional(),
  languages:       z.array(z.string()).default([]),
  languageMatched: z.boolean(),
  companionCount:  z.number().default(0),
})
export type InterpreterCandidate = z.infer<typeof interpreterCandidateSchema>

// ─── AD-보고서 관리 (AdminReportResponse · ConsultationResponse.Detail) ─────────

export const reportStatusSchema = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])
export type ReportStatus = z.infer<typeof reportStatusSchema>

export const reportItemSchema = z.object({
  consultationId:     z.string().uuid(),
  consultationDate:   z.string().nullable().optional(),
  patientId:          z.string().uuid(),
  patientName:        z.string().nullable().optional(),
  patientNationality: z.string().nullable().optional(),
  interpreterId:      z.string().uuid().nullable().optional(),
  interpreterName:    z.string().nullable().optional(),
  hospitalName:       z.string().nullable().optional(),
  department:         z.string().nullable().optional(),
  reportStatus:       reportStatusSchema,
  reportSubmittedAt:  z.string().nullable().optional(),
  reportRejectReason: z.string().nullable().optional(),
  createdAt:          z.string().nullable().optional(),
})
export type ReportItem = z.infer<typeof reportItemSchema>

export const reportDetailSchema = z.object({
  id:                    z.string().uuid(),
  consultationDate:      z.string().nullable().optional(),
  patientName:           z.string().nullable().optional(),
  patientNationality:    z.string().nullable().optional(),
  patientGender:         z.string().nullable().optional(),
  hospitalName:          z.string().nullable().optional(),
  department:            z.string().nullable().optional(),
  patientComment:        z.string().nullable().optional(),
  diagnosisContent:      z.string().nullable().optional(),
  treatmentResult:       z.string().nullable().optional(),
  medicationInstruction: z.string().nullable().optional(),
  nextAppointmentDate:   z.string().nullable().optional(),
  nextAppointmentTime:   z.string().nullable().optional(),
})
export type ReportDetail = z.infer<typeof reportDetailSchema>

// ─── AD-04 이주민 관리 (AdminPatientResponse) ───────────────────────────────────

export const patientItemSchema = z.object({
  patientId:         z.string().uuid(),
  name:              z.string().nullable().optional(),
  nationality:       z.string().nullable().optional(),
  gender:            z.string().nullable().optional(),
  phone:             z.string().nullable().optional(),
  consultationCount: z.number().default(0),
})
export type PatientItem = z.infer<typeof patientItemSchema>

export const patientDetailSchema = z.object({
  patientId:   z.string().uuid(),
  name:        z.string().nullable().optional(),
  birthDate:   z.string().nullable().optional(),
  gender:      z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  visaType:    z.string().nullable().optional(),
  phone:       z.string().nullable().optional(),
  region:      z.string().nullable().optional(),
})

/** ConsultationResponse.Detail 중 이용 이력에 필요한 필드 */
export const patientConsultationSchema = z.object({
  id:               z.string().uuid(),
  consultationDate: z.string().nullable().optional(),
  hospitalName:     z.string().nullable().optional(),
  interpreterName:  z.string().nullable().optional(),
})

// ─── AD-05 통번역가 관리 (AdminInterpreterResponse) ─────────────────────────────

export const interpreterItemSchema = z.object({
  interpreterId:          z.string().uuid(),
  name:                   z.string().nullable().optional(),
  phone:                  z.string().nullable().optional(),
  gender:                 z.string().nullable().optional(),
  nationality:            z.string().nullable().optional(),
  languages:              z.array(z.string()).default([]),
  totalConsultationCount: z.number().default(0),
})
export type InterpreterItem = z.infer<typeof interpreterItemSchema>

export const interpreterDetailSchema = z.object({
  interpreterId:    z.string().uuid(),
  name:             z.string().nullable().optional(),
  phone:            z.string().nullable().optional(),
  gender:           z.string().nullable().optional(),
  nationality:      z.string().nullable().optional(),
  languages:        z.array(z.string()).default([]),
  availableRegions: z.string().nullable().optional(),
  availableTimes:   z.string().nullable().optional(),
})

export const interpreterConsultationSchema = z.object({
  consultationId:   z.string().uuid(),
  consultationDate: z.string().nullable().optional(),
  hospitalName:     z.string().nullable().optional(),
  patientName:      z.string().nullable().optional(),
})

// ─── 환경설정 (AdminCenterResponse · AdminResponse) ─────────────────────────────

export const centerProfileSchema = z.object({
  centerId:         z.string().uuid(),
  name:             z.string(),
  address:          z.string().nullable().optional(),
  phone:            z.string().nullable().optional(),
  active:           z.boolean().optional(),
  managerNickname:  z.string().nullable().optional(),
  patientCount:     z.number().default(0),
  interpreterCount: z.number().default(0),
})
export type CenterProfile = z.infer<typeof centerProfileSchema>

export const sheetLinkSchema = z.object({
  spreadsheetId: z.string().nullable().optional(),
  url:           z.string().nullable().optional(),
  connected:     z.boolean(),
})

export const memberSchema = z.object({
  authUserId:    z.string().uuid(),
  role:          userRoleSchema.nullable().optional(),
  name:          z.string().nullable().optional(),
  phone:         z.string().nullable().optional(),
  email:         z.string().nullable().optional(),
  active:        z.boolean().optional(),
  interpreterId: z.string().uuid().nullable().optional(),
})
export type Member = z.infer<typeof memberSchema>

export const adminProfileSchema = z.object({
  id:         z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  nickname:   z.string().nullable().optional(),
})

