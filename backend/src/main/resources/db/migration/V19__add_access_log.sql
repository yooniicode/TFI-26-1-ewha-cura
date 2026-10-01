-- 개인정보 접속기록 (「개인정보의 안전성 확보조치 기준」 제8조)
-- 계정 · 접속일시 · 접속지 정보 · 처리한 정보주체 정보 · 수행업무를 남긴다.
-- 민감정보(건강정보)를 처리하므로 최소 2년 보관한다.

CREATE TABLE IF NOT EXISTS access_log
(
    id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id       UUID,
    role               VARCHAR(20),
    action             VARCHAR(20) NOT NULL,
    resource_type      VARCHAR(50),
    resource_id        UUID,
    subject_patient_id UUID,
    request_uri        VARCHAR(500),
    http_method        VARCHAR(10),
    ip_address         VARCHAR(64),
    user_agent         VARCHAR(300),
    status_code        INTEGER,
    result             VARCHAR(20) NOT NULL,
    detail             TEXT,
    occurred_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_log_occurred_at ON access_log (occurred_at);
CREATE INDEX IF NOT EXISTS idx_access_log_auth_user   ON access_log (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_subject     ON access_log (subject_patient_id);

-- 정보주체·취급자 삭제와 무관하게 기록이 남아야 하므로 FK 를 걸지 않는다.
COMMENT ON TABLE access_log IS '개인정보 접속기록 — append-only, 최소 2년 보관';
