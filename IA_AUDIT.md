# IA 대조 감사 — 최종 IA vs 현재 코드

> 기준: 2026-05-06 IA 이미지 (이주민 의료 통번역 서비스)

---

## 범례

| 기호 | 의미 |
|------|------|
| ✅ | IA와 일치, 현재 정상 작동 |
| 🔧 | IA에 있고 코드도 있지만 수정 필요 |
| ❌ | IA에 없음 → **주석처리/제거 대상** |
| 🆕 | IA에 있지만 코드 없음 → 미구현 (추후 추가) |

---

## 1. 통번역가 (interpreter)

### 내비게이션 현재 상태
`H(홈) · R(보고서) · P(이주민) · T(인수인계) · N(일지 작성) · C(채팅)`

| IA 항목 | 현재 구현 | 상태 | 파일 |
|---------|----------|------|------|
| 대시보드 홈 | `/dashboard` — "보고서 작성" 카드, "인수인계" 카드, 최근 보고서 5개 | ✅ | `dashboard/page.tsx` |
| 환자 배정 현황 | 배정된 환자 수를 대시보드에서 바로 확인 불가, `/patients`로 이동해야 함 | 🔧 | `dashboard/page.tsx` |
| 보고서 목록 | `/consultations` — 탭(일반/통역/staff), 검색, 페이징 | ✅ | `consultations/page.tsx` |
| 보고서 작성 | `/consultations/new` — 환자/병원/진료 정보 + 의료 메모 | ✅ | `consultations/new/page.tsx` |
| 이주민 목록 | `/patients` — 검색, 센터메모 읽기 전용 | ✅ | `patients/page.tsx` |
| 인수인계 | `/handovers` — 이주민 선택, 이유 입력 | ✅ | `handovers/page.tsx` |
| 의료대본 생성 | `/scripts/patient/[id]` — AI 생성 | 🔧 | `scripts/patient/[patientId]/page.tsx` |
| 의사에게 보여주기 | `/scripts/[id]/present` — 전체화면 대본 | ✅ | `scripts/[id]/present/page.tsx` |
| 채팅 | `/chat`, `/chat/[roomId]` | ✅ | `chat/page.tsx`, `chat/[roomId]/page.tsx` |
| 프로필 | `/mypage` — 이름/전화/언어/가능성 메모 | ✅ | `mypage/page.tsx` |
| 일지 작성(N) 내비 항목 | `/consultations/new` 바로가기 — 이미 R(보고서)에서 접근 가능하므로 중복 | ❌ | `navItems.ts:22` |

### 주석처리 대상
```
// navItems.ts:22
{ href: '/consultations/new', label: t.nav.new_consultation, icon: 'N', roles: ['interpreter'] },
// → R(보고서) 탭 내 "작성" 버튼으로 충분. 별도 내비 불필요
```

### 수정 필요
| 항목 | 현재 | 변경 내용 |
|------|------|-----------|
| 통번역가 대시보드 | "보고서 작성" + "인수인계" 카드만 표시 | 배정된 이주민 수 / 다음 예약 표시 추가 |
| 의료대본 nav 연결 | `/my-records`에서만 접근 가능 | 통번역가도 `/scripts/patient/[id]`를 이주민 상세에서 바로 접근 가능하게 확인 필요 |

---

## 2. 이주민 환자 (patient)

### 내비게이션 현재 상태
`H(홈) · Y(내 기록) · C(채팅)`

| IA 항목 | 현재 구현 | 상태 | 파일 |
|---------|----------|------|------|
| 홈 (공지 피드) | `/dashboard` — 공지사항 피드, 정책 리소스 3개 링크 | 🔧 | `dashboard/page.tsx` |
| 홈 — 다음 예약 카드 | 미구현 | 🆕 | — |
| 홈 — 배정된 통번역가 | 미구현 | 🆕 | — |
| 진료 기록 | `/my-records` — 진료일/병원/진단/처방/다음예약 카드 | ✅ | `my-records/page.tsx` |
| 의료대본 (의사에게 보여주기) | `/my-records` 하단 섹션 + `/scripts/[id]/present` | ✅ | `my-records/page.tsx` |
| 약 (복용 기록/관리) | **미구현** | 🆕 | — |
| 보험·마이데이터 연동 | **미구현 (MVP 범위 외)** | 🆕 | — |
| 채팅 | `/chat` — 통번역가와 채팅 | ✅ | `chat/page.tsx` |
| 프로필 | `/mypage` — 이름/전화/지역/비자/센터 연결 | ✅ | `mypage/page.tsx` |
| 정책 리소스 링크 (HiKorea/사회통합정보망/EPS) | `/dashboard` policyResources 섹션 | ❌ | `dashboard/page.tsx:74–93` |

### 주석처리 대상
```tsx
// dashboard/page.tsx:74–93
// IA에 정책 리소스 외부 링크 섹션 없음 → 주석처리
const policyResources = [
  { href: 'https://www.hikorea.go.kr/', ... },
  { href: 'https://www.socinet.go.kr/...', ... },
  { href: 'https://www.eps.go.kr/...', ... },
]
// + 렌더링 블록 (약 30줄) 동일하게 주석처리
```

### 수정 필요
| 항목 | 현재 | 변경 내용 |
|------|------|-----------|
| 환자 홈 | 공지 피드 + policyResources | policyResources 제거, "다음 예약" + "배정된 통번역가" 카드 추가 |
| 환자 내비 Y(내 기록) | 진료기록 + 의료대본 통합 | IA 기준 "진료" 항목과 매핑, 아이콘/레이블 정비 |

---

## 3. 관리자 (admin)

### 내비게이션 현재 상태
`H(홈) · R(보고서) · P(이주민) · M(매칭) · I(동번역가) · S(센터 직원) · C(채팅)`

| IA 항목 | 현재 구현 | 상태 | 파일 |
|---------|----------|------|------|
| 대시보드 (P/I/M 통계 카드) | `/dashboard` — 실제 숫자 표시 (방금 구현) | ✅ | `dashboard/page.tsx` |
| 센터 공지 작성/관리 | `/dashboard` — CRUD 폼 + 목록 | ✅ | `dashboard/page.tsx` |
| 보고서 — 통번역가 보고서 | `/consultations` — 탭 전환, 검색, 상세 보기/수정 | ✅ | `consultations/page.tsx` |
| 보고서 — 센터장 근무일지 | `/consultations` Staff Work 탭 | ✅ | `consultations/page.tsx` |
| 이주민 관리 | `/patients` — 등록/수정, 센터 연결, 메모 | ✅ | `patients/page.tsx` |
| 이주민 상세 | `/patients/[id]` — 기본정보/센터메모/진료이력 | ✅ | `patients/[id]/page.tsx` |
| 통번역가 관리 | `/interpreters` — 목록/비활성화/채팅 | ✅ | `interpreters/page.tsx` |
| 매칭 관리 | `/matching` — 생성/해제 | ✅ | `matching/page.tsx` |
| 센터 직원 관리 | `/members` — 역할 승인/변경 | ✅ | `members/page.tsx` |
| 채팅 | `/chat` | ✅ | `chat/page.tsx` |
| 프로필/센터 설정 | `/mypage` — 센터 선택/주소/별명 | ✅ | `mypage/page.tsx` |
| 인수인계 배정 (admin assign) | `PATCH /api/v1/handovers/:id/assign` | ❌ | `HandoverController.java:?` |
| 센터 목록 페이지 | `/centers` — 독립 페이지로 접근 | ❌ | `centers/page.tsx` |

### 주석처리 대상

#### `HandoverController.java` — admin 배정 엔드포인트
IA 기준 관리자는 인수인계를 직접 사용하지 않음. 통번역가끼리 인수인계 후 admin이 승인하는 flow도 IA에 보이지 않음.
```java
// HandoverController.java
// @PatchMapping("/{id}/assign") ← admin only, IA에 없음 → 주석처리 검토
```

#### `frontend/src/app/centers/page.tsx`
별도 `/centers` 페이지는 IA에 없음. 센터 관리는 `/mypage`에서 admin이 처리.
```
// centers/page.tsx 전체 → 주석처리 또는 route 제거
// navItems에도 없으므로 직접 접근 시에만 노출됨 (낮은 영향)
```

---

## 4. 백엔드 컨트롤러 주석처리 대상

| 컨트롤러 | 엔드포인트 | 사유 |
|---------|-----------|------|
| `HandoverController` | `PATCH /{id}/assign` | IA에 admin 인수인계 배정 flow 없음 |
| `MedicalScriptController` | `POST /generate` | AI 생성은 유지, 단 통번역가에게만 허용 여부 재확인 필요 |
| `HospitalController` | `POST /`, `PUT /{id}` | 병원 등록/수정은 IA에 없음. GET만 사용 (보고서 작성 시 검색용) |
| `CenterController` | `POST /`, `PUT /{id}` | mypage에서 admin이 처리하도록 통합됨. 직접 호출 불필요 여부 확인 |

---

## 5. 미구현 항목 우선순위

| 순위 | 기능 | 역할 | 설명 |
|------|------|------|------|
| 1 | 환자 홈 — 다음 예약 카드 | patient | 배정된 통번역가 + 최근 진료일 조회 |
| 2 | 환자 홈 — 배정된 통번역가 카드 | patient | PatientMatch로 배정된 통번역가 이름/채팅 버튼 |
| 3 | 통번역가 대시보드 — 배정 현황 | interpreter | 배정된 이주민 수 + 다음 예약 리스트 |
| 4 | 약(Medication) 섹션 | patient | 복용 중 약물 목록 (consultation.medicationInstruction에서 추출 가능) |
| 5 | 보험·마이데이터 | patient | MVP 이후 별도 연동 |

---

## 6. 현재 nav 항목 vs. IA 최종 nav

### 통번역가
| 현재 | 유지 | 제거/변경 |
|------|------|-----------|
| H 홈 | ✅ | |
| R 보고서 | ✅ | |
| P 이주민 | ✅ | |
| T 인수인계 | ✅ | |
| **N 일지 작성** | | ❌ 제거 (R에서 통합) |
| C 채팅 | ✅ | |

### 이주민 환자
| 현재 | 유지 | 제거/변경 |
|------|------|-----------|
| H 홈 | ✅ | |
| Y 내 기록 | 🔧 레이블 "진료"로 변경 고려 | |
| C 채팅 | ✅ | |
| (**약 탭**) | | 🆕 추가 예정 |

### 관리자 — 변경 없음 ✅
`H · R · P · M · I · S · C` 모두 IA와 일치
