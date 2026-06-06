-- avatar_url was added via ddl-auto:update but never tracked in Flyway.
-- This migration makes it official so clean-DB setups work correctly.
ALTER TABLE user_credentials
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024);
