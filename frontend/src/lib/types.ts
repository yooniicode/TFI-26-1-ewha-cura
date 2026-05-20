export type UserRole = 'admin' | 'interpreter' | 'patient'

export type Nationality =
  | 'VIETNAM' | 'CHINA' | 'CAMBODIA' | 'MYANMAR' | 'PHILIPPINES'
  | 'INDONESIA' | 'THAILAND' | 'NEPAL' | 'MONGOLIA' | 'UZBEKISTAN'
  | 'SRI_LANKA' | 'BANGLADESH' | 'PAKISTAN' | 'OTHER'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type VisaType = 'E9' | 'E6' | 'F1' | 'F2' | 'F4' | 'F5' | 'F6' | 'H2' | 'D2' | 'U' | 'OTHER'
export type IssueType = 'MEDICAL' | 'LEGAL' | 'LABOR' | 'IMMIGRATION' | 'OTHER'
export type ConsultationMethod = 'VISIT' | 'PHONE' | 'VIDEO' | 'OTHER'
export type ProcessingType = 'INTERPRETATION' | 'TRANSLATION' | 'COUNSELING' | 'OTHER'
export type InterpreterRole = 'ACTIVIST' | 'FREELANCER' | 'STAFF'
export type ScriptType = 'GENERAL' | 'EMERGENCY'
export type AnnouncementCategory = 'NOTICE' | 'POLICY' | 'RESOURCE'

export const NATIONALITY_LABEL: Record<Nationality, string> = {
  VIETNAM: '베트남', CHINA: '중국', CAMBODIA: '캄보디아', MYANMAR: '미얀마',
  PHILIPPINES: '필리핀', INDONESIA: '인도네시아', THAILAND: '태국',
  NEPAL: '네팔', MONGOLIA: '몽골', UZBEKISTAN: '우즈베키스탄',
  SRI_LANKA: '스리랑카', BANGLADESH: '방글라데시', PAKISTAN: '파키스탄', OTHER: '기타',
}
export const GENDER_LABEL: Record<Gender, string> = { MALE: '남', FEMALE: '여', OTHER: '기타' }
export const VISA_LABEL: Record<VisaType, string> = {
  E9: 'E-9', E6: 'E-6', F1: 'F-1', F2: 'F-2', F4: 'F-4', F5: 'F-5',
  F6: 'F-6', H2: 'H-2', D2: 'D-2', U: '미등록', OTHER: '기타',
}
export const ISSUE_LABEL: Record<IssueType, string> = {
  MEDICAL: '의료', LEGAL: '법률', LABOR: '노동', IMMIGRATION: '출입국', OTHER: '기타',
}
export const METHOD_LABEL: Record<ConsultationMethod, string> = {
  VISIT: '출장/동행', PHONE: '전화', VIDEO: '영상', OTHER: '기타',
}
export const INTERPRETER_ROLE_LABEL: Record<InterpreterRole, string> = {
  ACTIVIST: '통번역활동가', FREELANCER: '프리랜서', STAFF: '센터직원',
}
export const SCRIPT_LABEL: Record<ScriptType, string> = { GENERAL: '일반 진료', EMERGENCY: '응급' }

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
  doctorConfirmationSignature?: string
  durationHours?: number
  fee?: number
  nextAppointmentDate?: string
  confirmedAt?: string
  confirmedBy?: string
  confirmedByPhone?: string
  confirmed: boolean
  createdAt: string
  updatedAt: string
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
