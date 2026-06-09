/**
 * UT 더미데이터 시딩 스크립트
 * 실행: node scripts/seed-ut.mjs
 *
 * 배포된 /api/ut-login 엔드포인트로 토큰을 받아
 * 이주민 + 통번역가 계정에 더미데이터를 쌓습니다.
 */

const BASE = 'https://www.cura-ewha.kr'
const API  = `${BASE}/api/v1`

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok || !data.isSuccess) {
    throw new Error(`${method} ${path} → ${res.status} ${data.message ?? JSON.stringify(data)}`)
  }
  return data.payload
}

async function getUtToken(role) {
  const res = await fetch(`${BASE}/api/ut-login?role=${role}`)
  const data = await res.json()
  if (data.error) throw new Error(`UT 로그인 실패(${role}): ${data.error}`)
  return { token: data.token, me: data.me }
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 16)
}

function dateOnly(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ─── 더미 데이터 정의 ─────────────────────────────────────────────────────────

const CONSULTATIONS = [
  {
    consultationDate: daysAgo(95),
    hospitalName: '이화여자대학교 목동병원',
    department: '내과',
    issueType: 'MEDICAL',
    processing: 'INTERPRETATION',
    patientComment: '2주 전부터 복통과 소화불량이 있어요. 밥을 먹으면 더 심해집니다.',
    diagnosisNameCode: '위염 (K29)',
    diagnosisContent: '만성 위염으로 진단. 위내시경 결과 점막 부종 확인.',
    treatmentResult: '규칙적인 식사 권고, 맵고 자극적인 음식 제한',
    medicationInstruction: '란소프라졸 30mg 1일 1회 복용, 식전 30분 복용',
    nextAppointmentDate: dateOnly(-70),
    workDescription: '환자 복통 호소. 식후 팽만감 및 구역질 동반. 식이요법 안내.',
  },
  {
    consultationDate: daysAgo(62),
    hospitalName: '이화여자대학교 목동병원',
    department: '내과',
    issueType: 'MEDICAL',
    processing: 'INTERPRETATION',
    patientComment: '소화는 좀 나아졌는데 가끔 여전히 불편해요.',
    diagnosisNameCode: '위염 (K29)',
    diagnosisContent: '추적 관찰. 증상 호전 중. 약물 치료 2주 추가 유지.',
    treatmentResult: '자극적 음식 계속 피할 것',
    medicationInstruction: '기존 약 2주 추가 처방. 증상 소실 시 자가 중단 가능.',
    nextAppointmentDate: dateOnly(-35),
    workDescription: '재진. 위염 증상 70% 호전. 약 지속 처방.',
  },
  {
    consultationDate: daysAgo(30),
    hospitalName: '강서구보건소',
    department: '가정의학과',
    issueType: 'MEDICAL',
    processing: 'INTERPRETATION',
    patientComment: '독감 예방접종 맞으러 왔어요. 요즘 피로감이 심해요.',
    diagnosisNameCode: '피로증후군 (R53)',
    diagnosisContent: '독감 예방접종 완료. 전반적 피로감, 수면 부족 관련 상담.',
    treatmentResult: '충분한 수면과 규칙적인 운동 권고',
    medicationInstruction: '종합비타민 보충제 복용 권장. 필요 시 수면 보조제 상담.',
    nextAppointmentDate: dateOnly(30),
    workDescription: '독감 접종. 피로감 호소로 생활습관 상담 진행.',
  },
  {
    consultationDate: daysAgo(10),
    hospitalName: '서울시립은평병원',
    department: '정형외과',
    issueType: 'MEDICAL',
    processing: 'INTERPRETATION',
    patientComment: '한 달째 오른쪽 무릎이 아파요. 계단 오르내릴 때 특히 심해요.',
    diagnosisNameCode: '무릎 관절통 (M25.3)',
    diagnosisContent: 'X-ray상 특이 소견 없음. 과사용 증후군으로 판단.',
    treatmentResult: '무릎 과부하 운동 2주 제한, 냉온찜질 권고',
    medicationInstruction: '이부프로펜 400mg 필요시 복용 (1일 3회 이하), 식후 복용',
    nextAppointmentDate: dateOnly(14),
    workDescription: '무릎 통증 호소. 스포츠 활동 자제 및 물리치료 안내.',
  },
]

const HANDOVER = {
  reason: '통번역가 휴가로 인한 일시 인수인계',
  notes: '환자는 위염 치료 중으로 약 복용 여부 확인 필요. 한국어 의사소통이 어렵고 베트남어 통역 필수. 다음 정형외과 진료(2주 후)가 예정되어 있음.',
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 UT 더미데이터 시딩 시작\n')

  // 1. 토큰 및 me 정보 획득
  console.log('1/5 · UT 토큰 획득 중...')
  const { token: patToken, me: patMe }       = await getUtToken('patient')
  const { token: intToken, me: intMe }       = await getUtToken('interpreter')

  console.log(`    환자      authUserId=${patMe.authUserId}  entityId=${patMe.entityId}`)
  console.log(`    통번역가  authUserId=${intMe.authUserId}  entityId=${intMe.entityId}`)

  const patientId     = patMe.entityId
  const interpreterId = intMe.entityId

  if (!patientId)     throw new Error('환자 entityId가 없습니다. 가입 시 role=patient로 했는지 확인하세요.')
  if (!interpreterId) throw new Error('통번역가 entityId가 없습니다. 가입 시 role=interpreter로 했는지 확인하세요.')

  // 2. 통번역가 ↔ 환자 매칭
  console.log('\n2/5 · 매칭 생성 중...')
  try {
    const match = await api(intToken, 'POST', `/matching/self/${patientId}`)
    console.log(`    매칭 완료 matchId=${match.id}`)
  } catch (e) {
    if (e.message.includes('이미')) {
      console.log('    이미 매칭되어 있음 — 건너뜀')
    } else {
      console.warn(`    매칭 경고: ${e.message}`)
    }
  }

  // 3. 진료 기록 생성 (통번역가 권한으로)
  console.log('\n3/5 · 진료 기록 생성 중...')
  for (let i = 0; i < CONSULTATIONS.length; i++) {
    const c = CONSULTATIONS[i]
    const record = await api(intToken, 'POST', '/consultations', {
      ...c,
      patientId,
    })
    console.log(`    [${i + 1}/${CONSULTATIONS.length}] ${c.hospitalName} ${c.department} ${c.consultationDate.slice(0, 10)} → id=${record.id}`)
  }

  // 4. 인수인계 생성
  console.log('\n4/5 · 인수인계 생성 중...')
  const handover = await api(intToken, 'POST', '/handovers', {
    patientId,
    ...HANDOVER,
  })
  console.log(`    인수인계 완료 id=${handover.id}`)

  // 5. 검증 — 환자 계정으로 내 기록 조회
  console.log('\n5/5 · 검증 중...')
  const records = await api(patToken, 'GET', `/patients/${patientId}/my-records?page=0&size=20`)
  console.log(`    환자 진료기록 조회 → ${Array.isArray(records) ? records.length : '?'}건`)

  console.log('\n✅ 완료!\n')
  console.log('UT 링크:')
  console.log(`  이주민    → ${BASE}/ut?role=patient`)
  console.log(`  통번역가  → ${BASE}/ut?role=interpreter`)
}

main().catch(e => {
  console.error('\n❌ 오류:', e.message)
  process.exit(1)
})
