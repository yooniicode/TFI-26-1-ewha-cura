-- 센터장(어드민) 관리 기능 — 매칭 관리(AD-06), 보고서 승인(AD-보고서),
-- 통번역가 관리(AD-05), 담당 히스토리(AD-04-5)

-- ─── AD-06 매칭 관리 / AD-보고서 승인 관리 ────────────────────────────────
ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS matching_status              VARCHAR(20),
    ADD COLUMN IF NOT EXISTS matching_reject_reason       TEXT,
    ADD COLUMN IF NOT EXISTS assigned_at                  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS assigned_by_auth_user_id     UUID,
    ADD COLUMN IF NOT EXISTS report_status                VARCHAR(20),
    ADD COLUMN IF NOT EXISTS report_submitted_at          TIMESTAMP,
    ADD COLUMN IF NOT EXISTS report_reviewed_at           TIMESTAMP,
    ADD COLUMN IF NOT EXISTS report_reviewer_auth_user_id UUID,
    ADD COLUMN IF NOT EXISTS report_reviewer_name         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS report_reject_reason         TEXT;

-- 기존 데이터 백필: 통번역가가 있으면 배정 확정, 없으면 배정 대기
UPDATE consultation
SET matching_status = CASE WHEN interpreter_id IS NULL THEN 'PENDING' ELSE 'ASSIGNED' END
WHERE matching_status IS NULL;

UPDATE consultation
SET assigned_at = COALESCE(assigned_at, updated_at, created_at)
WHERE interpreter_id IS NOT NULL AND assigned_at IS NULL;

-- 기존 데이터 백필: report_completed 가 true 면 확인 여부에 따라 승인/대기, 아니면 작성중
UPDATE consultation
SET report_status = CASE
        WHEN report_completed IS NOT TRUE THEN 'DRAFT'
        WHEN confirmed_at IS NOT NULL      THEN 'APPROVED'
        ELSE 'PENDING'
    END
WHERE report_status IS NULL;

UPDATE consultation
SET report_submitted_at = COALESCE(report_submitted_at, updated_at, created_at)
WHERE report_completed IS TRUE AND report_submitted_at IS NULL;

UPDATE consultation
SET report_reviewed_at   = COALESCE(report_reviewed_at, confirmed_at::timestamp),
    report_reviewer_name = COALESCE(report_reviewer_name, confirmed_by)
WHERE confirmed_at IS NOT NULL AND report_reviewed_at IS NULL;

ALTER TABLE consultation
    ALTER COLUMN matching_status SET DEFAULT 'PENDING',
    ALTER COLUMN report_status   SET DEFAULT 'DRAFT';

ALTER TABLE consultation
    ALTER COLUMN matching_status SET NOT NULL,
    ALTER COLUMN report_status   SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_matching_status ON consultation (matching_status);
CREATE INDEX IF NOT EXISTS idx_consultation_report_status   ON consultation (report_status);
CREATE INDEX IF NOT EXISTS idx_consultation_date            ON consultation (consultation_date);

-- ─── AD-05 통번역가 프로필·활동정보 ───────────────────────────────────────
ALTER TABLE interpreter
    ADD COLUMN IF NOT EXISTS gender            VARCHAR(10),
    ADD COLUMN IF NOT EXISTS nationality       VARCHAR(50),
    ADD COLUMN IF NOT EXISTS available_regions VARCHAR(300),
    ADD COLUMN IF NOT EXISTS available_times   VARCHAR(300),
    ADD COLUMN IF NOT EXISTS certifications    TEXT,
    ADD COLUMN IF NOT EXISTS career_note       TEXT;

-- ─── AD-04-5 담당 히스토리 ────────────────────────────────────────────────
ALTER TABLE patient_match
    ADD COLUMN IF NOT EXISTS assigned_by_auth_user_id UUID,
    ADD COLUMN IF NOT EXISTS ended_at                 TIMESTAMP;

UPDATE patient_match
SET ended_at = COALESCE(ended_at, updated_at, created_at)
WHERE active = false AND ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patient_match_patient ON patient_match (patient_id);
