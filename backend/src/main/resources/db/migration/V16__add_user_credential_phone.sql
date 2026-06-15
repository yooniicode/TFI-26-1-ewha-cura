ALTER TABLE user_credentials
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 기존 전화번호 전용 가입자(합성 이메일)에서 phone 백필
UPDATE user_credentials
SET phone = regexp_replace(email, '^ph_([0-9]+)@phone\.cura\.local$', '\1')
WHERE phone IS NULL AND email ~ '^ph_[0-9]+@phone\.cura\.local$';

-- 연결된 Patient.phone에서 백필
UPDATE user_credentials uc
SET phone = regexp_replace(p.phone, '[^0-9]', '', 'g')
FROM patient p
WHERE uc.phone IS NULL
  AND uc.auth_user_id = p.auth_user_id
  AND p.phone IS NOT NULL
  AND regexp_replace(p.phone, '[^0-9]', '', 'g') <> '';

-- 연결된 Interpreter.phone에서 백필
UPDATE user_credentials uc
SET phone = regexp_replace(i.phone, '[^0-9]', '', 'g')
FROM interpreter i
WHERE uc.phone IS NULL
  AND uc.auth_user_id = i.auth_user_id
  AND i.phone IS NOT NULL
  AND regexp_replace(i.phone, '[^0-9]', '', 'g') <> '';

CREATE INDEX IF NOT EXISTS idx_user_credentials_phone ON user_credentials (phone);
