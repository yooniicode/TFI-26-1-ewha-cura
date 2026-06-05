-- UserCredential: email/passwordHash nullable (OAuth 지원), kakaoId 추가
ALTER TABLE user_credentials
    ALTER COLUMN email       DROP NOT NULL,
    ALTER COLUMN password_hash DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS kakao_id VARCHAR(50) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_credentials_kakao_id ON user_credentials (kakao_id);
