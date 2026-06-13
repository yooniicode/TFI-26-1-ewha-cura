ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS translation_lang        VARCHAR(10),
    ADD COLUMN IF NOT EXISTS translated_patient_comment         TEXT,
    ADD COLUMN IF NOT EXISTS translated_diagnosis_content       TEXT,
    ADD COLUMN IF NOT EXISTS translated_treatment_result        TEXT,
    ADD COLUMN IF NOT EXISTS translated_medication_instruction  TEXT;
