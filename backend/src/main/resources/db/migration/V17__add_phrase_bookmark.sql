CREATE TABLE IF NOT EXISTS phrase_bookmark
(
    id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id   UUID        NOT NULL,
    ko_text        TEXT        NOT NULL,
    translated_text TEXT,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    CONSTRAINT uk_phrase_bookmark_user_text UNIQUE (auth_user_id, ko_text)
);

CREATE INDEX IF NOT EXISTS idx_phrase_bookmark_auth_user_id ON phrase_bookmark (auth_user_id);
