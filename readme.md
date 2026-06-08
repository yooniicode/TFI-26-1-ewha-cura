# 이주민 의료 통번역 지원 플랫폼

`frontend`(Next.js) + `backend`(Spring Boot) + `PostgreSQL` 기반으로 구성되어 있으며, Supabase 인증(JWT)과 역할 기반 접근 제어를 사용합니다.

## ✨ 주요 기능 (Features)

- **비밀번호 없는 로그인 (Magic Link) 및 인증**: Supabase를 활용한 안전한 이메일 링크 인증과 비밀번호 초기화 프로세스 제공
- **역할 기반의 확실한 접근 제어 (RBAC)**: 관리자(ADMIN), 통번역가(INTERPRETER), 이주민(PATIENT) 역할에 따라 데이터에 대한 열람·수정 권한 분리
- **원스톱 상담 및 통번역 일지 관리**: 플랫폼 내부에서 통번역 활동 일지 생성(`/consultations/new`) 및 통합 관리 가능
- **이주민-통번역가 매칭 및 인수인계**: 통역 연속성을 보장하기 위한 담당자 지정 프로세스(매칭) 및 활동 기록 인수인계 추적
- **사용자 프로필 및 계정 권한 보호**: 사용자 본인의 실명 갱신 기능과 자기 자신을 강등시킬 수 없도록 막는 안전 장치 탑재

## 1) 전체 아키텍처

### 애플리케이션 흐름

```text
[Client Browser / PWA]
        |
        v
[Next.js Frontend]
  - Supabase Auth (session/token)
  - API proxy/calls
        |
        | Bearer JWT
        v
[Spring Boot Backend]
  - JWT Filter / RBAC (ADMIN, INTERPRETER, PATIENT)
  - Domain APIs (환자, 통번역가, 상담, 인수인계, 매칭, 의료대본, 센터, 관리자)
        |
        v
[PostgreSQL]
```

### 배포 인프라

```text
사용자 (모바일 PWA)
        |
        v
┌─────────────────┐       ┌──────────────────────────────────────────┐
│  Vercel         │       │  Railway Project                         │
│  (Next.js)      │──────▶│                                          │
│  cura-ewha.kr   │ HTTPS │  ┌──────────────────┐                   │
└─────────────────┘       │  │ Spring Boot API   │ (퍼블릭 URL 노출) │
                          │  └────────┬─────────┘                   │
        ┌─────────────────┤           │ *.railway.internal           │
        │  외부 서비스     │           │ (프라이빗 네트워크)           │
        │                 │  ┌────────▼─────────┐                   │
        │  Supabase        │  │  PostgreSQL DB    │ (외부 비노출)    │
        │  (파일 스토리지) │  └──────────────────┘                   │
        │  Kakao OAuth     │                                          │
        │  Gemini API      └──────────────────────────────────────────┘
        │  Google Sheets
        └─────────────────

[GitHub] ──push──▶ [GitHub Actions CI] ──테스트/빌드 통과──▶ Railway 자동 배포
                                                          └──▶ Vercel 자동 배포
```

## 2) 서버 아키텍처 (백엔드)

백엔드는 도메인 중심 패키지 구조를 따릅니다.

- `common`
  - 보안(`security`): JWT 필터, `UserPrincipal`, 시큐리티 설정
  - 응답/예외: 공통 `Response` 래퍼, 글로벌 예외 처리
  - 설정(`config`): OpenAPI/Swagger 등
- `domain`
  - `auth`: 내 정보 조회, role 기반 프로필 등록, 회원 관리, 최초 관리자 bootstrap
  - `admin`: 센터 관리자 프로필, 근무일지, 이주민 메모
  - `center`: 센터 엔티티 관리
  - `patient`, `Interpreter`, `consultation`, `handover`, `matching`, `medicalscript`
  - 각 도메인은 `controller -> service -> repository -> entity/dto` 구조

권한 모델:

- `ADMIN`: 센터 직원/관리자 권한 — 같은 센터 소속 데이터만 조회
- `INTERPRETER`: 통번역가 권한 — 본인에게 매칭된 환자 데이터만 조회
- `PATIENT`: 이주민(본인 데이터) 권한

인증 흐름:

1. 프론트에서 Supabase 로그인/세션 획득
2. API 요청 시 `Authorization: Bearer <token>` 전달
3. 백엔드 `JwtAuthFilter`가 JWT 검증 후 `UserPrincipal` 구성
   - `JWT_SECRET`이 Supabase JWT Secret과 일치하면 로컬 검증 (권장)
   - 불일치 시 Supabase `/auth/v1/user` API로 fallback 검증 (`SUPABASE_URL`, `SUPABASE_ANON_KEY` 필요)
4. 서비스 계층에서 role 기반 접근 제어 수행

## 3) 프론트엔드 아키텍처

- 프레임워크: Next.js App Router
- 주요 구성
  - `src/app`: 페이지 라우트
    - `/`: 플랫폼 소개 랜딩 페이지 (비로그인 접근 가능)
    - `/login`: 로그인/회원가입
    - `/auth/complete`: 프로필 등록 / 승인 대기 / 최초 관리자 bootstrap
    - `/auth/callback`: 이메일 OTP(Magic Link 등) 콜백 처리
    - `/auth/reset-password`: 잊어버린 비밀번호 재설정
    - `/dashboard`, `/consultations(/new)`, `/patients`, `/interpreters`, `/matching`, `/handovers`, `/members`, `/mypage`
  - `src/components/AppShell`: 레이아웃 (AppHeader, AppNavigation, AuthGateOverlays, LayoutModeToggle)
  - `src/lib/api/`: 도메인별 API 클라이언트 분리 (`auth`, `admin`, `centers`, ...)
  - `src/lib/supabase.ts`: Supabase 클라이언트/토큰 처리
  - `src/middleware.ts`: 인증 라우팅 가드 (`/`는 공개, 나머지는 로그인 필요)

## 4) 기술 스택

### Frontend

| 분류 | 기술 | 버전 |
|---|---|---|
| 프레임워크 | Next.js (App Router) | 14.2.29 |
| 언어 | TypeScript | 5.x |
| UI | React | 18.3.1 |
| 스타일링 | Tailwind CSS | 3.4 |
| 인증 | Supabase JS + SSR | 2.49 / 0.5 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |
| 유틸리티 | clsx | 2.1 |
| 린터 | ESLint (eslint-config-next) | 8.x |

### Backend

| 분류 | 기술 | 버전 |
|---|---|---|
| 언어 | Java | 21 |
| 프레임워크 | Spring Boot | 3.3.5 |
| 빌드 도구 | Gradle | - |
| ORM | Spring Data JPA (Hibernate) | - |
| DB 마이그레이션 | Flyway (비활성화 중, 설계 안정화 후 적용 예정) | - |
| 인증 | Spring Security + JWT (JJWT) | 0.12.6 |
| 인증 공급자 | Supabase (JWT 검증 + 서비스 키) | - |
| API 문서 | SpringDoc OpenAPI (Swagger UI) | 2.6.0 |
| 유효성 검사 | Spring Validation | - |
| 헬스체크 | Spring Boot Actuator | - |
| 코드 단순화 | Lombok | - |
| DB (운영) | PostgreSQL (Supabase, PgBouncer 트랜잭션 모드) | - |
| DB (테스트) | H2 (in-memory) | - |
| 테스트 | JUnit 5 + Spring Security Test | - |
| AI | Google Gemini API (gemini-2.0-flash) | - |

### 인프라 / 배포

| 분류 | 기술 | 역할 |
|---|---|---|
| 프론트 호스팅 | Vercel | Next.js 프로덕션 배포 |
| 백엔드 호스팅 | Railway | Docker 컨테이너 배포 |
| DB 호스팅 | Supabase (PostgreSQL) | 관계형 DB + 인증 |
| 컨테이너 | Docker | 백엔드 이미지 빌드 |
| 이미지 레지스트리 | GitHub Container Registry (GHCR) | Docker 이미지 저장 |
| CI/CD | GitHub Actions | 테스트 → 빌드 → 배포 자동화 |
| 소스 관리 | GitHub | - |

## 5) API 문서 (Swagger)

백엔드 실행 후:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

## 6) 로컬 실행

### 사전 준비

루트에 `.env.local` 파일이 있어야 합니다. `.env.example`을 복사해 작성하세요.

### 6.1 전체 스택 실행 (권장, Docker)

```powershell
docker compose --env-file .env.local down; 
docker compose --env-file .env.local up --build
```

- `frontend`: `http://localhost:3000`
- `backend`: `http://localhost:8080`
- `db`: `localhost:5432`

### 6.2 개별 실행 (Windows PowerShell)

```powershell
# DB만 실행
docker-compose --env-file .env.local up db

# 백엔드 실행 (터미널 1)
docker-compose --env-file .env.local up db backend

# 프론트 로컬 실행 (터미널 2)
cd frontend
npm install
npm run dev
```

백엔드를 Docker 없이 직접 실행할 경우:

```powershell
$env:SPRING_PROFILES_ACTIVE="local"
$env:JWT_SECRET="<Supabase JWT Secret>"
$env:SUPABASE_URL="<Supabase URL>"
$env:SUPABASE_ANON_KEY="<Supabase Anon Key>"
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5433/byby"
cd backend
.\gradlew bootRun
```

## 7) 환경 변수

루트 `.env.local` 기준으로 사용합니다.

핵심 변수:

- DB: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_PORT`
- Backend: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ADMIN_BOOTSTRAP_CODE`, `GEMINI_API_KEY`
- Frontend (빌드타임 공개): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_KAKAO_REST_API_KEY`, `NEXT_PUBLIC_KAKAO_REDIRECT_URI`
- Frontend (런타임 서버전용): `GEMINI_API_KEY`, `GROQ_API_KEY`(선택), `HIRA_API_KEY`
- 공통: `FRONTEND_URL`, `BACKEND_PORT`, `FRONTEND_PORT`

샘플은 `.env.example` 참고.

### JWT_SECRET 설정 방법

`JWT_SECRET`은 **Supabase 대시보드 → Settings → API → JWT Secret** 값으로 설정하는 것을 권장합니다.
이렇게 하면 백엔드가 Supabase JWT를 외부 API 호출 없이 로컬에서 직접 검증할 수 있습니다.

`SUPABASE_SERVICE_KEY`는 회원 목록 조회, 역할 변경, 최초 관리자 등록 등 Supabase Admin API 호출에 필요합니다.

## 8) 데이터베이스 마이그레이션

현재 엔티티 설계가 진행 중이므로 Flyway는 비활성화 상태입니다. `ddl-auto: update`로 Hibernate가 스키마를 자동 반영합니다.

엔티티 설계가 안정화되면 Flyway를 활성화하고 마이그레이션 파일(`backend/src/main/resources/db/migration`)을 관리할 예정입니다.

> **Supabase PgBouncer 주의**: 운영 환경에서 Supabase 연결 풀러(PgBouncer 트랜잭션 모드)를 사용할 경우 Hibernate의 Prepared Statement와 충돌이 발생합니다. `application.yaml` prod 프로필에 `prepareThreshold: 0`이 설정되어 있어 자동으로 처리됩니다.

## 9) CI/CD 파이프라인

`/.github/workflows/deploy.yml`

- **PR/push 시 GitHub Actions CI 실행** (배포 전 안전망):
  - Backend: Gradle 테스트 (JUnit 5 + H2)
  - Frontend: ESLint 린트 + Next.js 빌드 검증
- **`main` push 시 자동 배포** (GitHub 소스 직접 연동):
  - Railway: GitHub 소스에서 Dockerfile 빌드 후 자동 배포
  - Vercel: Next.js 자동 빌드 후 배포

### GitHub Secrets 필요 항목

| 시크릿 | 설명 |
|---|---|
| `RAILWAY_TOKEN` | Railway 계정 API 토큰 |
| `RAILWAY_PROJECT_ID` | Railway 프로젝트 ID |
| `RAILWAY_SERVICE_ID` | Railway 서비스 ID |
| `RAILWAY_ENV_ID` | Railway 환경 ID |
| `VERCEL_TOKEN` | Vercel 계정 API 토큰 |
| `VERCEL_ORG_ID` | Vercel 조직/계정 ID |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 ID |
| `NEXT_PUBLIC_API_URL` | 프로덕션 백엔드 URL — Docker 이미지 빌드 시 번들에 포함 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL — Docker 빌드용 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 — Docker 빌드용 |
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 카카오 REST API 키 — Docker 빌드용 |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | 카카오 콜백 URI (프로덕션) — Docker 빌드용 |

> `NEXT_PUBLIC_*` 변수는 **GitHub Secrets**(Docker 이미지 빌드 시 번들 삽입)와 **Vercel 대시보드**(Vercel 배포 빌드) 양쪽에 모두 등록합니다. 백엔드 환경변수는 **Railway 서비스 환경변수**에 등록합니다.

### Railway 서비스 환경변수 필요 항목

| 변수 | 설명 |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | Supabase PostgreSQL 연결 URL |
| `JWT_SECRET` | Supabase JWT Secret (대시보드 → Settings → API) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase anon 키 |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 키 |
| `ADMIN_BOOTSTRAP_CODE` | 최초 센터 직원 등록용 인증 코드 |
| `FRONTEND_URL` | Vercel 배포 URL (CORS 허용) |
| `GEMINI_API_KEY` | Gemini API 키 (의료 대본 AI 생성) |

## 10) 디렉터리 구조

```text
.
├─ backend/
│  ├─ src/main/java/com/byby/backend/
│  │  ├─ common/
│  │  └─ domain/
│  │     ├─ admin/       # 센터 관리자 프로필, 근무일지, 이주민 메모
│  │     ├─ auth/        # 인증, 회원 관리
│  │     ├─ center/      # 센터 엔티티
│  │     ├─ consultation/
│  │     ├─ handover/
│  │     ├─ Interpreter/
│  │     ├─ matching/
│  │     ├─ medicalscript/
│  │     └─ patient/
│  └─ src/main/resources/
│     ├─ application.yaml
│     └─ db/migration/
├─ frontend/
│  └─ src/
│     ├─ app/            # 페이지 라우트
│     ├─ components/
│     │  ├─ layout/      # AppHeader, AppNavigation, AuthGateOverlays, LayoutModeToggle
│     │  └─ ui/
│     ├─ hooks/
│     └─ lib/
│        ├─ api/         # 도메인별 API 클라이언트
│        └─ ...
├─ docker-compose.yml
└─ .github/workflows/deploy.yml
```
