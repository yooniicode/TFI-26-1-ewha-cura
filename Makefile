.PHONY: dev db backend frontend admin down db-reset build test gen-key install

# 전체 스택 실행 (docker compose)
dev:
	docker compose --env-file .env.local up --build

# DB만 실행
db:
	docker compose --env-file .env.local up db -d
	@echo "PostgreSQL running on localhost:$(DB_PORT)"

# 백엔드 로컬 실행 (DB가 먼저 필요)
backend:
	cd backend && ./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트엔드 로컬 실행
frontend:
	cd frontend && npm run dev

# 관리자 콘솔 로컬 실행 (http://localhost:3001)
admin:
	cd admin && npm run dev

# 프론트엔드 의존성 설치
install:
	cd frontend && npm install
	cd admin && npm install

# 전체 중지
down:
	docker compose down

# DB 초기화 (볼륨 삭제 → Flyway 재실행)
db-reset:
	docker compose down -v
	docker compose --env-file .env.local up db -d
	@echo "Database reset. Run 'make backend' to apply Flyway migrations."

# 백엔드 JAR 빌드
build:
	cd backend && ./gradlew build -x test --no-daemon

# 테스트 실행
test:
	cd backend && ./gradlew test --no-daemon

# JWT secret 생성
gen-secret:
	@openssl rand -base64 64
	@echo "^ Copy this to JWT_SECRET in .env.local"

# Claude API key 확인
check-env:
	@echo "CLAUDE_API_KEY: $${CLAUDE_API_KEY:+set}$${CLAUDE_API_KEY:-NOT SET}"
	@echo "SUPABASE_URL: $${SUPABASE_URL:+set}$${SUPABASE_URL:-NOT SET}"
	@echo "JWT_SECRET: $${JWT_SECRET:+set}$${JWT_SECRET:-NOT SET}"
