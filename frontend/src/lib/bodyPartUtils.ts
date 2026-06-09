import type { PatientReport } from '@/lib/types'

export type BodyPartKey = 'ear' | 'eye' | 'mouth' | 'vertebrae' | 'pelvis' | 'head' | 'chest' | 'abdomen' | 'legs' | 'arm'

export const BODY_PART_KEYS: BodyPartKey[] = ['ear', 'eye', 'mouth', 'vertebrae', 'pelvis', 'head', 'chest', 'abdomen', 'legs', 'arm']

export function bodyPartImagePath(key: BodyPartKey): string {
  return `/icons/common/body-parts/${key}.png`
}

export function getBodyPartKey(record: { diagnosisNameCode?: string | null; department?: string | null }): BodyPartKey {
  const code = record.diagnosisNameCode ?? ''
  const dept = (record.department ?? '').toLowerCase()
  const icdMatch = code.match(/\(([A-Z][0-9]+(?:\.[0-9]+)?)\)/)
  const icd = icdMatch ? icdMatch[1] : ''
  const icdNum = icd ? parseInt(icd.substring(1), 10) : -1
  const icdLetter = icd ? icd[0] : ''

  if (dept.includes('이비인후')) return 'ear'
  if (dept.includes('안과')) return 'eye'
  if (dept.includes('치과') || dept.includes('구강')) return 'mouth'
  if (dept.includes('정형') || dept.includes('재활')) return 'vertebrae'
  if (dept.includes('산부인과') || dept.includes('비뇨')) return 'pelvis'
  if (dept.includes('신경')) return 'head'
  if (dept.includes('흉부') || dept.includes('호흡') || dept.includes('심장')) return 'chest'
  if (dept.includes('소화') || dept.includes('위장')) return 'abdomen'

  if (icdLetter === 'H' && icdNum >= 60) return 'ear'
  if (icdLetter === 'H') return 'eye'
  if (icdLetter === 'K' && icdNum <= 14) return 'mouth'
  if (icdLetter === 'K') return 'abdomen'
  if (icdLetter === 'J' || icdLetter === 'I') return 'chest'
  if (icdLetter === 'M') return 'vertebrae'
  if (icdLetter === 'N') return 'pelvis'
  if (icdLetter === 'G') return 'head'
  if (icdLetter === 'S' && icdNum >= 70) return 'legs'
  if (icdLetter === 'S' && icdNum >= 40) return 'arm'

  return 'vertebrae'
}

export function getBodyPartImage(record: PatientReport): string {
  return bodyPartImagePath(getBodyPartKey(record))
}

export function getDiseaseShortName(diagnosisNameCode: string | undefined): string {
  if (!diagnosisNameCode) return ''
  return diagnosisNameCode.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

export function getIcdCode(diagnosisNameCode: string | undefined): string {
  if (!diagnosisNameCode) return ''
  const match = diagnosisNameCode.match(/\(([A-Z][A-Z0-9.]+)\)/)
  return match ? match[1] : ''
}
