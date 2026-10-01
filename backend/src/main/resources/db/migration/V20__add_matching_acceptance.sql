-- AD-06 매칭 관리: 센터장 배정 → 통번역가 수락 대기 → 배정 확정
-- 통번역가가 거절하거나 센터장이 배정을 취소하면 '재배정 필요'로 표시한다.

ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS reassignment_required BOOLEAN NOT NULL DEFAULT FALSE;

-- matching_status 에 AWAITING_ACCEPTANCE(19자)가 추가된다. 기존 VARCHAR(20) 로 충분.

CREATE INDEX IF NOT EXISTS idx_consultation_created_at ON consultation (created_at DESC);
