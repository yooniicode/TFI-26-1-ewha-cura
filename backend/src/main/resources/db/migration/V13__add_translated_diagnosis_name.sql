ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS translated_diagnosis_name_code TEXT;
