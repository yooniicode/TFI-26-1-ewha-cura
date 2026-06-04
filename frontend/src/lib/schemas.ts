import { z } from 'zod'

// ─── 공통 Enum ───────────────────────────────────────────────
export const nationalitySchema = z.enum([
  'KOREA','UNITED_STATES','VIETNAM','CHINA','CAMBODIA','MYANMAR','PHILIPPINES',
  'INDONESIA','THAILAND','NEPAL','MONGOLIA','UZBEKISTAN',
  'SRI_LANKA','BANGLADESH','PAKISTAN','OTHER',
])
export const genderSchema          = z.enum(['MALE','FEMALE','OTHER'])
export const visaTypeSchema        = z.enum(['E9','E6','F1','F2','F4','F5','F6','H2','D2','U','OTHER'])
export const issueTypeSchema       = z.enum(['MEDICAL','LEGAL','LABOR','IMMIGRATION','OTHER'])
export const methodSchema          = z.enum(['VISIT','PHONE','VIDEO','OTHER'])
export const processingTypeSchema  = z.enum(['INTERPRETATION','TRANSLATION','COUNSELING','OTHER'])
export const interpreterRoleSchema = z.enum(['ACTIVIST','FREELANCER','STAFF'])
export const scriptTypeSchema      = z.enum(['GENERAL','EMERGENCY'])
export const userRoleSchema        = z.enum(['admin','interpreter','patient'])
export const announcementCategorySchema = z.enum(['NOTICE','POLICY','RESOURCE'])

// ─── 엔티티 ─────────────────────────────────────────────────
const nullableString = z.string().nullable().optional().transform(v => v ?? undefined)
const nullableUuid = z.string().uuid().nullable().optional().transform(v => v ?? undefined)
const nullableNumber = z.number().nullable().optional().transform(v => v ?? undefined)

export const centerSummarySchema = z.object({
  id:   z.string().uuid(),
  name: z.string(),
})

export const patientSchema = z.object({
  id:            z.string().uuid(),
  name:          z.string(),
  nationality:   nationalitySchema,
  gender:        genderSchema,
  visaType:      visaTypeSchema,
  visaNote:      nullableString,
  birthDate:     nullableString,
  phone:         nullableString,
  region:        nullableString,
  centers:       z.array(centerSummarySchema).optional().default([]),
  accountLinked: z.boolean().optional().default(false),
  assignedToMe:  z.boolean().optional().default(false),
  activeInterpreterId: z.string().uuid().nullable().optional(),
  activeInterpreterName: z.string().nullable().optional(),
  createdAt:     z.string(),
  updatedAt:     z.string().optional().default(''),
})

export const interpreterSchema = z.object({
  id:        z.string().uuid(),
  name:      z.string(),
  phone:     nullableString,
  role:      interpreterRoleSchema,
  centerId:  z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  languages: z.array(z.string()).optional().default([]),
  availabilityNote: z.string().nullable().optional(),
  monthlyWorkHours: z.number().optional().default(0),
  active:    z.boolean(),
  createdAt: z.string().optional().default(''),
})

export const centerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  active: z.boolean().optional().default(true),
})

export const hospitalSchema = z.object({
  id:      z.string().uuid(),
  name:    z.string(),
  address: z.string().nullable().optional(),
  phone:   z.string().nullable().optional(),
})

export const consultationSchema = z.object({
  id:                  z.string().uuid(),
  consultationDate:    z.string(),
  patientId:           z.string().uuid(),
  patientName:         z.string(),
  patientBirthDate:    nullableString,
  patientNationality:  nationalitySchema.nullable().optional().transform(v => v ?? undefined),
  patientGender:       genderSchema.nullable().optional().transform(v => v ?? undefined),
  patientVisaType:     visaTypeSchema.nullable().optional().transform(v => v ?? undefined),
  patientRegion:       nullableString,
  patientPhone:        nullableString,
  interpreterId:       nullableUuid,
  interpreterName:     nullableString,
  createdByName:       nullableString,
  hospitalId:          nullableUuid,
  hospitalName:        nullableString,
  department:          nullableString,
  doctorName:          nullableString,
  issueType:           issueTypeSchema,
  method:              methodSchema.nullable().optional().transform(v => v ?? undefined),
  processing:          processingTypeSchema.nullable().optional().transform(v => v ?? undefined),
  memo:                nullableString,
  patientComment:      nullableString,
  treatmentResult:     nullableString,
  diagnosisContent:    nullableString,
  diagnosisNameCode:   nullableString,
  medicationInstruction: nullableString,
  counselorName:       nullableString,
  workDescription:     nullableString,
  doctorConfirmationSignature: nullableString,
  durationHours:       nullableNumber,
  fee:                 nullableNumber,
  nextAppointmentDate: nullableString,
  confirmedAt:         nullableString,
  confirmedBy:         nullableString,
  confirmedByPhone:    nullableString,
  confirmed:           z.boolean(),
  createdAt:           z.string().optional().default(''),
  updatedAt:           z.string().optional().default(''),
})

export const patientReportSchema = z.object({
  id:                    z.string().uuid(),
  consultationDate:      z.string(),
  interpreterId:         nullableUuid,
  interpreterName:       nullableString,
  hospitalName:          nullableString,
  department:            nullableString,
  doctorName:            nullableString,
  patientComment:        nullableString,
  treatmentResult:       nullableString,
  diagnosisContent:      nullableString,
  diagnosisNameCode:     nullableString,
  medicationInstruction: nullableString,
  nextAppointmentDate:   nullableString,
})

export const handoverSchema = z.object({
  id:                   z.string().uuid(),
  patientId:            z.string().uuid(),
  patientName:          z.string(),
  fromInterpreterId:    z.string().uuid().optional(),
  fromInterpreterName:  z.string().optional(),
  toInterpreterId:      z.string().uuid().optional(),
  toInterpreterName:    z.string().optional(),
  consultationId:       z.string().uuid().optional(),
  reason:               z.string(),
  notes:                z.string().optional(),
  assigned:             z.boolean(),
  createdAt:            z.string(),
})

export const patientMatchSchema = z.object({
  id:              z.string().uuid(),
  patientId:       z.string().uuid(),
  patientName:     z.string(),
  interpreterId:   z.string().uuid(),
  interpreterName: z.string(),
  active:          z.boolean(),
  createdAt:       z.string(),
})

export const medicalScriptSchema = z.object({
  id:            z.string().uuid(),
  patientId:     z.string().uuid(),
  patientName:   z.string(),
  consultationId: z.string().uuid().optional(),
  scriptType:    scriptTypeSchema,
  contentKo:     z.string(),
  contentOrigin: z.string().optional(),
  createdAt:     z.string(),
})

export const authMeSchema = z.object({
  authUserId: z.string(),
  role:       userRoleSchema.nullable().optional(),
  name:       z.string().nullable().optional(),
  entityId:   z.string().uuid().nullable().optional(),
  centerId:   z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  nickname:   z.string().nullable().optional(),
})

export const emailExistsSchema = z.object({
  exists: z.boolean(),
})

export const memberSchema = z.object({
  authUserId: z.string().uuid(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'interpreter']),
  interpreterRole: interpreterRoleSchema.nullable().optional(),
  interpreterId: z.string().uuid().nullable().optional(),
  centerId: z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  profileRegistered: z.boolean(),
  approved: z.boolean(),
})

export const adminProfileSchema = z.object({
  id: z.string().uuid(),
  authUserId: z.string().uuid(),
  centerId: z.string().uuid().nullable().optional(),
  centerName: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
})

export const adminWorkLogTaskSchema = z.object({
  content: z.string(),
  checked: z.boolean(),
})

export const adminWorkLogSchema = z.object({
  id: z.string().uuid(),
  workDate: z.string(),
  memo: z.string().nullable().optional(),
  tasks: z.array(adminWorkLogTaskSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const centerPatientMemoSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  adminAuthUserId: z.string().uuid(),
  publicMemo: z.string().nullable().optional(),
  privateMemo: z.string().nullable().optional(),
  interpreterVisible: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const announcementSchema = z.object({
  id: z.string().uuid(),
  centerId: z.string().uuid(),
  centerName: z.string(),
  authorAuthUserId: z.string().uuid(),
  category: announcementCategorySchema,
  title: z.string(),
  content: z.string(),
  linkUrl: z.string().nullable().optional(),
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const chatRoomMemberSchema = z.object({
  authUserId: z.string().uuid(),
  memberName: z.string().nullable().optional(),
  role: z.enum(['admin', 'interpreter', 'patient']),
  lastReadAt: z.string(),
})

export const chatRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable().optional(),
  lastMessage: z.string().nullable().optional(),
  lastMessageAt: z.string().nullable().optional(),
  lastMessageSenderName: z.string().nullable().optional(),
  unreadCount: z.number(),
  members: z.array(chatRoomMemberSchema),
})

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  senderAuthUserId: z.string().uuid(),
  senderName: z.string().nullable().optional(),
  content: z.string(),
  createdAt: z.string(),
})

export const chatUnreadCountSchema = z.object({ total: z.number() })

export const adminCenterStatsSchema = z.object({
  patientCount:     z.number(),
  interpreterCount: z.number(),
  activeMatchCount: z.number(),
})

export const interpreterAssignedCountSchema = z.object({
  count: z.number(),
})

// ─── 배열 스키마 ─────────────────────────────────────────────
export const schemas = {
  patient:       patientSchema,
  patients:      z.array(patientSchema),
  center:        centerSchema,
  centers:       z.array(centerSchema),
  interpreter:   interpreterSchema,
  interpreters:  z.array(interpreterSchema),
  hospital:      hospitalSchema,
  hospitals:     z.array(hospitalSchema),
  consultation:  consultationSchema,
  consultations: z.array(consultationSchema),
  patientReport: patientReportSchema,
  patientReports: z.array(patientReportSchema),
  handover:      handoverSchema,
  handovers:     z.array(handoverSchema),
  match:         patientMatchSchema,
  matches:       z.array(patientMatchSchema),
  script:        medicalScriptSchema,
  scripts:       z.array(medicalScriptSchema),
  authMe:        authMeSchema,
  emailExists:   emailExistsSchema,
  member:        memberSchema,
  members:       z.array(memberSchema),
  adminProfile:  adminProfileSchema,
  adminWorkLog:  adminWorkLogSchema,
  adminWorkLogs: z.array(adminWorkLogSchema),
  centerPatientMemo: centerPatientMemoSchema,
  centerPatientMemos: z.array(centerPatientMemoSchema),
  announcement: announcementSchema,
  announcements: z.array(announcementSchema),
  chatRoom:     chatRoomSchema,
  chatRooms:    z.array(chatRoomSchema),
  chatMessage:  chatMessageSchema,
  chatMessages: z.array(chatMessageSchema),
  chatUnreadCount: chatUnreadCountSchema,
  adminCenterStats: adminCenterStatsSchema,
  interpreterAssignedCount: interpreterAssignedCountSchema,
}
