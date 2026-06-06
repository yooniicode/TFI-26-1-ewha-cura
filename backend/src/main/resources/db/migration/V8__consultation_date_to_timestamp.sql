ALTER TABLE consultation
    ALTER COLUMN consultation_date TYPE TIMESTAMP USING consultation_date::TIMESTAMP;
