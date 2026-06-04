CREATE TABLE IF NOT EXISTS user_credentials (
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email         VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_user_id  UUID         NOT NULL,
    requested_role VARCHAR(20) NOT NULL DEFAULT 'patient',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_credentials_email       UNIQUE (email),
    CONSTRAINT uq_user_credentials_auth_user_id UNIQUE (auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_credentials_email       ON user_credentials (email);
CREATE INDEX IF NOT EXISTS idx_user_credentials_auth_user_id ON user_credentials (auth_user_id);
