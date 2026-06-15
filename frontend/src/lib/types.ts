export type UserRole = 'admin' | 'interpreter' | 'patient'

export type Nationality =
  | 'KOREA' | 'UNITED_STATES' | 'VIETNAM' | 'CHINA' | 'CAMBODIA' | 'MYANMAR' | 'PHILIPPINES'
  | 'INDONESIA' | 'THAILAND' | 'NEPAL' | 'MONGOLIA' | 'UZBEKISTAN'
  | 'SRI_LANKA' | 'BANGLADESH' | 'PAKISTAN' | 'OTHER'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type VisaType = 'E9' | 'E6' | 'F1' | 'F2' | 'F4' | 'F5' | 'F6' | 'H2' | 'D2' | 'U' | 'OTHER'
export type IssueType = 'MEDICAL' | 'LEGAL' | 'LABOR' | 'IMMIGRATION' | 'OTHER'

export const ISSUE_LABEL: Record<IssueType, string> = {
  MEDICAL: '의료',
  LEGAL: '법률',
  LABOR: '노동',
  IMMIGRATION: '출입국',
  OTHER: '기타',
}

export const NATIONALITY_LABEL: Record<Nationality, string> = {
  KOREA: '한국',
  UNITED_STATES: '미국',
  VIETNAM: '베트남',
  CHINA: '중국',
  CAMBODIA: '캄보디아',
  MYANMAR: '미얀마',
  PHILIPPINES: '필리핀',
  INDONESIA: '인도네시아',
  THAILAND: '태국',
  NEPAL: '네팔',
  MONGOLIA: '몽골',
  UZBEKISTAN: '우즈베키스탄',
  SRI_LANKA: '스리랑카',
  BANGLADESH: '방글라데시',
  PAKISTAN: '파키스탄',
  OTHER: '기타',
}

export const VISA_LABEL: Record<VisaType, string> = {
  E9: 'E-9 (비전문취업)',
  E6: 'E-6 (예술흥행)',
  F1: 'F-1 (방문동거)',
  F2: 'F-2 (거주)',
  F4: 'F-4 (재외동포)',
  F5: 'F-5 (영주)',
  F6: 'F-6 (결혼이민)',
  H2: 'H-2 (방문취업)',
  D2: 'D-2 (유학)',
  U: 'U (미등록)',
  OTHER: '기타',
}
export type ConsultationMethod = 'VISIT' | 'PHONE' | 'VIDEO' | 'OTHER'
export type ProcessingType = 'INTERPRETATION' | 'TRANSLATION' | 'COUNSELING' | 'OTHER'
export type InterpreterRole = 'ACTIVIST' | 'FREELANCER' | 'STAFF'
export type ScriptType = 'GENERAL' | 'EMERGENCY'
export type AnnouncementCategory = 'NOTICE' | 'POLICY' | 'RESOURCE'

// API response types
export interface ApiResponse<T> {
  statusCode: number
  isSuccess: boolean
  message: string
  payload: T
  pageInfo?: PageInfo
}
export interface PageInfo {
  page: number
  size: number
  hasNext: boolean
  totalElements: number
  totalPages: number
}

export interface CenterSummary {
  id: string
  name: string
}

export interface Patient {
  id: string
  name: string
  nationality: Nationality
  gender: Gender
  visaType: VisaType
  visaNote?: string
  birthDate?: string
  phone?: string
  region?: string
  centers: CenterSummary[]
  accountLinked: boolean
  assignedToMe?: boolean
  activeInterpreterId?: string | null
  activeInterpreterName?: string | null
  createdAt: string
  updatedAt: string
  avatarUrl?: string | null
}

export interface Interpreter {
  id: string
  name: string
  phone?: string
  role: InterpreterRole
  centerId?: string | null
  centerName?: string | null
  languages: string[]
  availabilityNote?: string | null
  monthlyWorkHours?: number
  active: boolean
  createdAt: string
}

export interface Center {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  active: boolean
}

export interface Hospital { id: string; name: string; address?: string | null; phone?: string | null }

export interface Consultation {
  id: string
  consultationDate: string
  patientId: string
  patientName: string
  patientBirthDate?: string
  patientNationality?: Nationality
  patientGender?: Gender
  patientVisaType?: VisaType
  patientRegion?: string
  patientWorkplace?: string
  patientPhone?: string
  interpreterId?: string
  interpreterName?: string
  createdByName?: string
  hospitalId?: string
  hospitalName?: string
  department?: string
  doctorName?: string
  issueType: IssueType
  method?: ConsultationMethod
  processing?: ProcessingType
  memo?: string
  patientComment?: string
  treatmentResult?: string
  diagnosisContent?: string
  diagnosisNameCode?: string
  medicationInstruction?: string
  counselorName?: string
  workDescription?: string
  memoCompleted: boolean
  reportCompleted: boolean
  translationLang?: string
  translatedPatientComment?: string
  translatedDiagnosisContent?: string
  translatedTreatmentResult?: string
  translatedMedicationInstruction?: string
  translatedDiagnosisNameCode?: string
  doctorConfirmationSignature?: string
  durationHours?: number
  fee?: number
  nextAppointmentDate?: string
  nextAppointmentTime?: string
  confirmedAt?: string
  confirmedBy?: string
  confirmedByPhone?: string
  confirmed: boolean
  createdAt: string
  updatedAt: string
  patientAvatarUrl?: string | null
}

export interface PatientReport {
  id: string
  consultationDate: string
  interpreterId?: string
  interpreterName?: string
  hospitalName?: string
  department?: string
  doctorName?: string
  patientComment?: string
  treatmentResult?: string
  diagnosisContent?: string
  diagnosisNameCode?: string
  medicationInstruction?: string
  nextAppointmentDate?: string
  translationLang?: string | null
  translatedPatientComment?: string | null
  translatedDiagnosisContent?: string | null
  translatedTreatmentResult?: string | null
  translatedMedicationInstruction?: string | null
  translatedDiagnosisNameCode?: string | null
}

export interface Handover {
  id: string
  patientId: string
  patientName: string
  fromInterpreterId?: string
  fromInterpreterName?: string
  toInterpreterId?: string
  toInterpreterName?: string
  consultationId?: string
  reason: string
  notes?: string
  assigned: boolean
  createdAt: string
}

export interface PatientMatch {
  id: string
  patientId: string
  patientName: string
  interpreterId: string
  interpreterName: string
  interpreterPhone?: string | null
  active: boolean
  createdAt: string
}

export interface MedicalScript {
  id: string
  patientId: string
  patientName: string
  consultationId?: string
  scriptType: ScriptType
  contentKo: string
  contentOrigin?: string
  createdAt: string
}

export interface AuthMe {
  authUserId: string
  role?: UserRole | null
  name?: string | null
  entityId?: string | null
  centerId?: string | null
  centerName?: string | null
  nickname?: string | null
  avatarUrl?: string | null
}

export interface EmailExists {
  exists: boolean
}

export interface Member {
  authUserId: string
  email?: string | null
  name?: string | null
  phone?: string | null
  role: Extract<UserRole, 'admin' | 'interpreter'>
  interpreterRole?: InterpreterRole | null
  interpreterId?: string | null
  centerId?: string | null
  centerName?: string | null
  profileRegistered: boolean
  approved: boolean
}

export interface UpdateMemberRoleRequest {
  role: Extract<UserRole, 'admin' | 'interpreter'>
  interpreterRole?: InterpreterRole
  name?: string
  phone?: string
  centerId?: string
  centerName?: string
}

export interface RegisterProfileRequest {
  name: string
  role?: Extract<UserRole, 'interpreter' | 'patient'>
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

export interface AdminProfile {
  id: string
  authUserId: string
  centerId?: string | null
  centerName?: string | null
  nickname?: string | null
}

export interface AdminWorkLogTask {
  content: string
  checked: boolean
}

export interface AdminWorkLog {
  id: string
  workDate: string
  memo?: string | null
  tasks: AdminWorkLogTask[]
  createdAt: string
  updatedAt: string
}

export interface UpsertAdminWorkLogRequest {
  workDate: string
  memo?: string
  tasks: AdminWorkLogTask[]
}

export interface CenterPatientMemo {
  id: string
  patientId: string
  adminAuthUserId: string
  publicMemo?: string | null
  privateMemo?: string | null
  interpreterVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertCenterPatientMemoRequest {
  publicMemo?: string
  privateMemo?: string
  interpreterVisible: boolean
}

export interface Announcement {
  id: string
  centerId: string
  centerName: string
  authorAuthUserId: string
  category: AnnouncementCategory
  title: string
  content: string
  linkUrl?: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertAnnouncementRequest {
  category: AnnouncementCategory
  title: string
  content: string
  linkUrl?: string
  pinned: boolean
}

export interface ChatRoomMember {
  authUserId: string
  memberName?: string | null
  role: 'admin' | 'interpreter' | 'patient'
  lastReadAt: string
}

export interface ChatRoom {
  id: string
  name?: string | null
  lastMessage?: string | null
  lastMessageAt?: string | null
  lastMessageSenderName?: string | null
  unreadCount: number
  members: ChatRoomMember[]
}

export interface ChatMessage {
  id: string
  roomId: string
  senderAuthUserId: string
  senderName?: string | null
  content: string
  createdAt: string
}

export interface SendMessageRequest {
  content: string
}
