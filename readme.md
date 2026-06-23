# Cura
이주민 환자가 자신의 의료 정보를 모국어로 확인하고 스스로 관리할 수 있도록 돕는 의료정보 전달 플랫폼 Cura입니다.

링크 이주민통번역센터와 함께했으며, 혁신기술상(1위)을 수상하였습니다.

## [🔗 테크포임팩트 소개 자료](https://kakao-impact-foundation.github.io/campus_2026_spring/projects/5/)
작동 영상 및 피칭 자료는 해당 링크에서 확인하실 수 있습니다.


## 기술 스택

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

## 인프라 / 배포

| 분류 | 기술 | 역할 |
|---|---|---|
| 프론트 호스팅 | Vercel | Next.js 프로덕션 배포 |
| 백엔드 호스팅 | Railway | Docker 컨테이너 배포 |
| DB 호스팅 | Supabase (PostgreSQL) | 관계형 DB + 인증 |
| 컨테이너 | Docker | 백엔드 이미지 빌드 |
| 이미지 레지스트리 | GitHub Container Registry (GHCR) | Docker 이미지 저장 |
| CI/CD | GitHub Actions | 테스트 → 빌드 → 배포 자동화 |
| 소스 관리 | GitHub | - |

## 로컬 실행 관련

```powershell
docker compose --env-file .env.local down; 
docker compose --env-file .env.local up --build
```

- `frontend`: `http://localhost:3000`
- `backend`: `http://localhost:8080`
- `db`: `localhost:5432`
\
```
