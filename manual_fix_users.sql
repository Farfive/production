-- Manual Fix for Manufacturing Platform Users
-- Execute this in SQLite database: backend/manufacturing_platform.db

-- Step 1: Fix all existing users to be active
UPDATE users 
SET email_verified = 1, 
    is_active = 1, 
    registration_status = 'active'
WHERE email_verified = 0 OR registration_status != 'active' OR registration_status IS NULL;

-- Step 2: Check if mock users exist, if not add them
-- Note: You'll need to replace password_hash with properly hashed values

-- Check current users
SELECT id, email, is_active, email_verified, registration_status, role FROM users;

-- If mock users don't exist, add them manually:
-- (You'll need to generate proper bcrypt hashes for these passwords)

/*
INSERT OR REPLACE INTO users (
    email, password_hash, first_name, last_name, company_name,
    phone, role, registration_status, is_active, email_verified,
    data_processing_consent, marketing_consent, 
    email_verification_token, created_at, updated_at, consent_date,
    nip, company_address, gdpr_data_export_requested, 
    gdpr_data_deletion_requested, last_login, email_verification_sent_at,
    password_reset_token, password_reset_expires
) VALUES 
(
    'client@test.com',
    -- Replace with proper bcrypt hash of 'Test123!'
    '$2b$12$PLACEHOLDER_HASH_FOR_Test123!',
    'Test', 'Client', 'Test Client Company',
    '+1-555-0001', 'client', 'active', 1, 1,
    1, 1, 
    'mock_token_client', datetime('now'), datetime('now'), datetime('now'),
    NULL, NULL, 0, 
    0, NULL, datetime('now'),
    NULL, NULL
),
(
    'producer@test.com',
    -- Replace with proper bcrypt hash of 'Test123!'
    '$2b$12$PLACEHOLDER_HASH_FOR_Test123!',
    'Test', 'Producer', 'Test Manufacturing Co',
    '+1-555-0002', 'producer', 'active', 1, 1,
    1, 1,
    'mock_token_producer', datetime('now'), datetime('now'), datetime('now'),
    NULL, NULL, 0,
    0, NULL, datetime('now'),
    NULL, NULL
);
*/

-- Verify the changes
SELECT COUNT(*) as total_users, 
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
       SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users
FROM users;

-- Show sample users
SELECT id, email, role, is_active, email_verified, registration_status 
FROM users 
LIMIT 10; 