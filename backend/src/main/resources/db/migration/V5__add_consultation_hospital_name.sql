ALTER TABLE consultation
    ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(200);
