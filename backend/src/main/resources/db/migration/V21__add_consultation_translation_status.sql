-- 번역을 요청-응답 밖(백그라운드 워커/Lambda)에서 처리하기 위한 상태 컬럼.
-- translation_version 은 같은 작업이 두 번 와도(최소 1회 전달) 결과가 한 번만 쓰이게 하는 낙관적 토큰이다.
ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS translation_status  VARCHAR(16) NOT NULL DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS translation_version BIGINT      NOT NULL DEFAULT 0;

UPDATE consultation SET translation_status = 'DONE' WHERE translation_lang IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultation_translation_status ON consultation (translation_status);
