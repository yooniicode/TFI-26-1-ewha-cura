'use client'

import { useTranslation, type Language } from './I18nContext'
import type {
  ConsultationMethod,
  Gender,
  InterpreterRole,
  IssueType,
  Nationality,
  ProcessingType,
  ScriptType,
  VisaType,
} from '@/lib/types'

export const NATIONALITIES: Nationality[] = [
  'KOREA',
  'UNITED_STATES',
  'VIETNAM',
  'CHINA',
  'CAMBODIA',
  'MYANMAR',
  'PHILIPPINES',
  'INDONESIA',
  'THAILAND',
  'NEPAL',
  'MONGOLIA',
  'UZBEKISTAN',
  'SRI_LANKA',
  'BANGLADESH',
  'PAKISTAN',
  'OTHER',
]

export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER']
export const VISA_TYPES: VisaType[] = ['E9', 'E6', 'F1', 'F2', 'F4', 'F5', 'F6', 'H2', 'D2', 'U', 'OTHER']
export const ISSUE_TYPES: IssueType[] = ['MEDICAL', 'LEGAL', 'LABOR', 'IMMIGRATION', 'OTHER']
export const CONSULTATION_METHODS: ConsultationMethod[] = ['VISIT', 'PHONE', 'VIDEO', 'OTHER']
export const PROCESSING_TYPES: ProcessingType[] = ['INTERPRETATION', 'TRANSLATION', 'COUNSELING', 'OTHER']
export const INTERPRETER_ROLES: InterpreterRole[] = ['ACTIVIST', 'STAFF']
export const SCRIPT_TYPES: ScriptType[] = ['GENERAL', 'EMERGENCY']

export interface EnumLabels {
  nationality: Record<Nationality, string>
  gender: Record<Gender, string>
  visa: Record<VisaType, string>
  issue: Record<IssueType, string>
  method: Record<ConsultationMethod, string>
  processing: Record<ProcessingType, string>
  interpreterRole: Record<InterpreterRole, string>
  script: Record<ScriptType, string>
}

export const enumLabels: Partial<Record<Language, EnumLabels>> = {
  ko: {
    nationality: {
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
    } satisfies Record<Nationality, string>,
    gender: {
      MALE: '남성',
      FEMALE: '여성',
      OTHER: '기타',
    } satisfies Record<Gender, string>,
    visa: {
      E9: 'E-9',
      E6: 'E-6',
      F1: 'F-1',
      F2: 'F-2',
      F4: 'F-4',
      F5: 'F-5',
      F6: 'F-6',
      H2: 'H-2',
      D2: 'D-2',
      U: '미등록',
      OTHER: '기타',
    } satisfies Record<VisaType, string>,
    issue: {
      MEDICAL: '의료',
      LEGAL: '법률',
      LABOR: '노동',
      IMMIGRATION: '출입국',
      OTHER: '기타',
    } satisfies Record<IssueType, string>,
    method: {
      VISIT: '출장/동행',
      PHONE: '전화',
      VIDEO: '영상',
      OTHER: '기타',
    } satisfies Record<ConsultationMethod, string>,
    processing: {
      INTERPRETATION: '통역',
      TRANSLATION: '번역',
      COUNSELING: '상담',
      OTHER: '기타',
    } satisfies Record<ProcessingType, string>,
    interpreterRole: {
      ACTIVIST: '통번역활동가',
      FREELANCER: '프리랜서',
      STAFF: '센터직원',
    } satisfies Record<InterpreterRole, string>,
    script: {
      GENERAL: '일반 진료',
      EMERGENCY: '응급',
    } satisfies Record<ScriptType, string>,
  },
  en: {
    nationality: {
      KOREA: 'Korea',
      UNITED_STATES: 'United States',
      VIETNAM: 'Vietnam',
      CHINA: 'China',
      CAMBODIA: 'Cambodia',
      MYANMAR: 'Myanmar',
      PHILIPPINES: 'Philippines',
      INDONESIA: 'Indonesia',
      THAILAND: 'Thailand',
      NEPAL: 'Nepal',
      MONGOLIA: 'Mongolia',
      UZBEKISTAN: 'Uzbekistan',
      SRI_LANKA: 'Sri Lanka',
      BANGLADESH: 'Bangladesh',
      PAKISTAN: 'Pakistan',
      OTHER: 'Other',
    } satisfies Record<Nationality, string>,
    gender: {
      MALE: 'Male',
      FEMALE: 'Female',
      OTHER: 'Other',
    } satisfies Record<Gender, string>,
    visa: {
      E9: 'E-9',
      E6: 'E-6',
      F1: 'F-1',
      F2: 'F-2',
      F4: 'F-4',
      F5: 'F-5',
      F6: 'F-6',
      H2: 'H-2',
      D2: 'D-2',
      U: 'Undocumented',
      OTHER: 'Other',
    } satisfies Record<VisaType, string>,
    issue: {
      MEDICAL: 'Medical',
      LEGAL: 'Legal',
      LABOR: 'Labor',
      IMMIGRATION: 'Immigration',
      OTHER: 'Other',
    } satisfies Record<IssueType, string>,
    method: {
      VISIT: 'On-site / accompaniment',
      PHONE: 'Phone',
      VIDEO: 'Video',
      OTHER: 'Other',
    } satisfies Record<ConsultationMethod, string>,
    processing: {
      INTERPRETATION: 'Interpretation',
      TRANSLATION: 'Translation',
      COUNSELING: 'Counseling',
      OTHER: 'Other',
    } satisfies Record<ProcessingType, string>,
    interpreterRole: {
      ACTIVIST: 'Community interpreter',
      FREELANCER: 'Freelancer',
      STAFF: 'Center staff',
    } satisfies Record<InterpreterRole, string>,
    script: {
      GENERAL: 'General care',
      EMERGENCY: 'Emergency',
    } satisfies Record<ScriptType, string>,
  },
  vi: {
    nationality: {
      KOREA: 'Hàn Quốc',
      UNITED_STATES: 'Hoa Kỳ',
      VIETNAM: 'Việt Nam',
      CHINA: 'Trung Quốc',
      CAMBODIA: 'Campuchia',
      MYANMAR: 'Myanmar',
      PHILIPPINES: 'Philippines',
      INDONESIA: 'Indonesia',
      THAILAND: 'Thái Lan',
      NEPAL: 'Nepal',
      MONGOLIA: 'Mông Cổ',
      UZBEKISTAN: 'Uzbekistan',
      SRI_LANKA: 'Sri Lanka',
      BANGLADESH: 'Bangladesh',
      PAKISTAN: 'Pakistan',
      OTHER: 'Khác',
    } satisfies Record<Nationality, string>,
    gender: {
      MALE: 'Nam',
      FEMALE: 'Nữ',
      OTHER: 'Khác',
    } satisfies Record<Gender, string>,
    visa: {
      E9: 'E-9',
      E6: 'E-6',
      F1: 'F-1',
      F2: 'F-2',
      F4: 'F-4',
      F5: 'F-5',
      F6: 'F-6',
      H2: 'H-2',
      D2: 'D-2',
      U: 'Chưa đăng ký',
      OTHER: 'Khác',
    } satisfies Record<VisaType, string>,
    issue: {
      MEDICAL: 'Y tế',
      LEGAL: 'Pháp lý',
      LABOR: 'Lao động',
      IMMIGRATION: 'Xuất nhập cảnh',
      OTHER: 'Khác',
    } satisfies Record<IssueType, string>,
    method: {
      VISIT: 'Tại chỗ / đi cùng',
      PHONE: 'Điện thoại',
      VIDEO: 'Video',
      OTHER: 'Khác',
    } satisfies Record<ConsultationMethod, string>,
    processing: {
      INTERPRETATION: 'Phiên dịch',
      TRANSLATION: 'Biên dịch',
      COUNSELING: 'Tư vấn',
      OTHER: 'Khác',
    } satisfies Record<ProcessingType, string>,
    interpreterRole: {
      ACTIVIST: 'Tình nguyện viên phiên dịch',
      FREELANCER: 'Tự do',
      STAFF: 'Nhân viên trung tâm',
    } satisfies Record<InterpreterRole, string>,
    script: {
      GENERAL: 'Khám thông thường',
      EMERGENCY: 'Khẩn cấp',
    } satisfies Record<ScriptType, string>,
  },
}

export function useEnumLabels(): EnumLabels {
  const { lang } = useTranslation()
  return enumLabels[lang] ?? enumLabels.en!
}
