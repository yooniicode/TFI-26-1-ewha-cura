# LinkUs 백엔드 API 작업 정리 (최종 IA 기준)

> 기준일: 2026-05-06  
> 대상 브랜치: `main`  
> 스크린샷 기준 역할: 센터장 (admin)

---

## 1. 최종 IA 요약

### 센터장 (admin)
| 영역 | 내용 |
|------|------|
| 헤더 | 이름·센터명, 언어 전환, 모바일/PC 토글 |
| 대시보드 퀵링크 | **P** 이주민 · **I** 동번역가 · **M** 매칭 |
| 홈 본문 | 센터 공지 작성 폼 + 기존 공지 목록 |
| 하단 내비 (7) | H 홈 · R 보고서 · P 이주민 · M 매칭 · I 동번역가 · S 센터 직원 · C 채팅 |

### 동번역가 (interpreter)
하단 내비: H 홈 · R 보고서 · P 이주민 · T 인수인계 · N 일지 작성 · C 채팅

### 이주민 (patient)
하단 내비: H 홈 · C 채팅  
홈 본문: 공지 피드 + 정책 리소스 링크

---

## 2. 현재 상태 (변경된 파일)

| 파일 | 상태 | 내용 |
|------|------|------|
| `common/security/AuthRoleResolver.java` | **신규** | JWT 롤이 DB 실제 상태와 다를 때 보정. filter마다 admin→interpreter→patient 순으로 DB 조회 |
| `common/security/JwtAuthFilter.java` | **수정** | `AuthRoleResolver.resolve()` 사용하여 SecurityContext에 보정된 principal 저장 |
| `common/security/SecurityConfig.java` | **수정** | `AuthRoleResolver` bean 주입 |
| `domain/auth/service/AuthService.java` | **수정** | `AuthRoleResolver` 주입 후 `getMe()` 내부에서도 `resolve()` 재호출 (→ 문제 있음, 아래 참조) |
| `frontend/src/app/auth/complete/page.tsx` | **수정** | 가입 완료 플로우 개선 |

---

## 3. 백엔드 수정 항목

### 3-A. `AuthService.getMe()` — 중복 resolve 제거 ⚠️

**문제:** `JwtAuthFilter`가 이미 `AuthRoleResolver.resolve()`를 실행해서 SecurityContext에 저장하는데,  
`AuthService.getMe()`에서 **또 한 번** `authRoleResolver.resolve(principal)`을 호출한다.  
같은 요청 내에서 DB 조회가 최대 6번 중복된다.

```java
// AuthService.java — 현재 코드 (제거 대상)
principal = authRoleResolver.resolve(principal);   // ← filter가 이미 했음
```

**수정:**
- `AuthService`에서 `AuthRoleResolver authRoleResolver` 필드 및 생성자 주입 **제거**
- `getMe()` 첫 줄의 `authRoleResolver.resolve(principal)` 호출 **제거**
- `getMe()` 내 `else` 블록(patient role일 때 interpreter 레코드 조회)은 **유지** — pending 통번역가가 아직 JWT 갱신 전일 때 정상 동작하는 의도적인 로직

---

### 3-B. 어드민 센터 통계 API 신규 추가

대시보드 P / I / M 카드에 실제 숫자를 표시하려면 백엔드 엔드포인트가 필요하다.

#### 3-B-1. Repository 쿼리 추가

**`PatientCenterRepository`**
```java
long countByCenterId(UUID centerId);
```

**`InterpreterRepository`**
```java
long countByCenter_IdAndActiveTrue(UUID centerId);
```

**`PatientMatchRepository`**
```java
@Query("SELECT COUNT(pm) FROM PatientMatch pm WHERE pm.active = true AND pm.interpreter.center.id = :centerId")
long countActiveByInterpreterCenter(@Param("centerId") UUID centerId);
```

#### 3-B-2. `AdminResponse`에 `CenterStats` 레코드 추가

```java
public record CenterStats(
    long patientCount,
    long interpreterCount,
    long activeMatchCount
) {}
```

#### 3-B-3. `AdminService.getStats()` 추가

```java
public AdminResponse.CenterStats getStats(UserPrincipal principal) {
    Center center = getAdminCenter(principal);
    long patients    = patientCenterRepository.countByCenterId(center.getId());
    long interpreters= interpreterRepository.countByCenter_IdAndActiveTrue(center.getId());
    long matches     = patientMatchRepository.countActiveByInterpreterCenter(center.getId());
    return new AdminResponse.CenterStats(patients, interpreters, matches);
}
```

#### 3-B-4. `AdminController`에 엔드포인트 추가

```java
@GetMapping("/stats")
@PreAuthorize("hasRole('admin')")
@Operation(summary = "센터 통계 조회")
public ResponseEntity<Response<AdminResponse.CenterStats>> getStats(
        @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(Response.success(SuccessCode.OK, adminService.getStats(principal)));
}
```

---

### 3-C. 마이너 검토 사항

| 항목 | 현황 | 조치 |
|------|------|------|
| `AnnouncementController.list` 권한 | `hasAnyRole('admin', 'patient')` | 유지 (interpreter는 공지 피드 없음) |
| `ConsultationController.getAll` 권한 | `hasAnyRole('interpreter', 'admin')` | 유지 |
| `AuthController.deleteAccount` | `@PreAuthorize` 없음, 내부에서 null 체크 | `@PreAuthorize("isAuthenticated()")` 추가 권장 |
| `CenterService.getOrCreateByName` — 바이그램 유사도 | 전체 센터 메모리 로드 후 비교 | 센터 수 적은 MVP에서는 허용 |
| `AuthRoleResolver` 매 요청 DB 조회 | 요청당 최대 3회 쿼리 | MVP 수준 허용, 추후 캐시 도입 가능 |

---

## 4. 프론트엔드 연동 항목

### 4-A. `adminApi.stats()` 추가 (`frontend/src/lib/api/admin.ts`)

```ts
stats: () => get('/admin/stats', schemas.adminCenterStats),
```

### 4-B. `adminCenterStats` 스키마 추가 (`frontend/src/lib/schemas.ts`)

```ts
export const adminCenterStatsSchema = z.object({
  patientCount:     z.number(),
  interpreterCount: z.number(),
  activeMatchCount: z.number(),
})
```
`schemas` 객체에도 추가:
```ts
adminCenterStats: adminCenterStatsSchema,
```

### 4-C. 대시보드 P/I/M 카드에 숫자 표시 (`frontend/src/app/dashboard/page.tsx`)

```tsx
const { data: stats } = useQuery({
  queryKey: queryKeys.admin.stats,
  queryFn: () => adminApi.stats().then(r => r.payload),
  enabled: me?.role === 'admin' && !!(me.centerId || me.centerName),
})

// 카드 렌더링 시
{ href: '/patients',     label: t.nav.patients,     icon: 'P', count: stats?.patientCount },
{ href: '/interpreters', label: t.nav.interpreters,  icon: 'I', count: stats?.interpreterCount },
{ href: '/matching',     label: t.nav.matching,       icon: 'M', count: stats?.activeMatchCount },
```

### 4-D. `queryKeys`에 admin stats 키 추가

```ts
admin: {
  stats: ['admin', 'stats'] as const,
},
```

---

## 5. 작업 우선순위

| 순서 | 항목 | 파일 | 난이도 |
|------|------|------|--------|
| 1 | `AuthService.getMe()` 중복 resolve 제거 | `AuthService.java` | 낮음 |
| 2 | Repository 카운트 쿼리 추가 | 3개 Repository | 낮음 |
| 3 | `AdminResponse.CenterStats` + `AdminService.getStats()` | `AdminResponse.java`, `AdminService.java` | 낮음 |
| 4 | `AdminController.getStats()` 엔드포인트 | `AdminController.java` | 낮음 |
| 5 | `deleteAccount` `@PreAuthorize` 추가 | `AuthController.java` | 낮음 |
| 6 | 프론트 스키마·API 추가 | `schemas.ts`, `admin.ts` | 낮음 |
| 7 | 대시보드 카드 숫자 표시 | `dashboard/page.tsx` | 중간 |

---

## 6. 변경 없이 유지하는 것

- 전체 내비게이션 구조 (`navItems.ts`) — 이미 IA와 일치
- 공지 CRUD API — 정상 동작
- 매칭·상담·인수인계 컨트롤러 — 정상 동작
- `AuthRoleResolver` 로직 자체 — 올바름, 중복 호출만 제거
- 프론트 `auth/complete` 페이지 — 이미 수정 완료
