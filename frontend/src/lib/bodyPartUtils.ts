import type { PatientReport } from '@/lib/types'

export function getBodyPartImage(record: PatientReport): string {
  const code = record.diagnosisNameCode ?? ''
  const dept = (record.department ?? '').toLowerCase()
  const icdMatch = code.match(/\(([A-Z][0-9]+(?:\.[0-9]+)?)\)/)
  const icd = icdMatch ? icdMatch[1] : ''
  const icdNum = icd ? parseInt(icd.substring(1), 10) : -1
  const icdLetter = icd ? icd[0] : ''

  if (dept.includes('이비인후')) return '/icons/common/body-parts/ear.png'
  if (dept.includes('안과')) return '/icons/common/body-parts/eye.png'
  if (dept.includes('치과') || dept.includes('구강')) return '/icons/common/body-parts/mouth.png'
  if (dept.includes('정형') || dept.includes('재활')) return '/icons/common/body-parts/vertebrae.png'
  if (dept.includes('산부인과') || dept.includes('비뇨')) return '/icons/common/body-parts/pelvis.png'
  if (dept.includes('신경')) return '/icons/common/body-parts/head.png'
  if (dept.includes('흉부') || dept.includes('호흡') || dept.includes('심장')) return '/icons/common/body-parts/chest.png'
  if (dept.includes('소화') || dept.includes('위장')) return '/icons/common/body-parts/abdomen.png'

  if (icdLetter === 'H' && icdNum >= 60) return '/icons/common/body-parts/ear.png'
  if (icdLetter === 'H') return '/icons/common/body-parts/eye.png'
  if (icdLetter === 'K' && icdNum <= 14) return '/icons/common/body-parts/mouth.png'
  if (icdLetter === 'K') return '/icons/common/body-parts/abdomen.png'
  if (icdLetter === 'J') return '/icons/common/body-parts/chest.png'
  if (icdLetter === 'I') return '/icons/common/body-parts/chest.png'
  if (icdLetter === 'M') return '/icons/common/body-parts/vertebrae.png'
  if (icdLetter === 'N') return '/icons/common/body-parts/pelvis.png'
  if (icdLetter === 'G') return '/icons/common/body-parts/head.png'
  if (icdLetter === 'S' && icdNum >= 70) return '/icons/common/body-parts/legs.png'
  if (icdLetter === 'S' && icdNum >= 40) return '/icons/common/body-parts/arm.png'

  return '/icons/common/body-parts/vertebrae.png'
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
