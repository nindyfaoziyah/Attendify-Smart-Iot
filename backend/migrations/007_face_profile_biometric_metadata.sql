-- Migration 007: Add confidence_score and registered_at to face_profiles
-- Run this once to extend the face profiles table for production biometric tracking

ALTER TABLE face_profiles
    ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT NULL AFTER verification_status,
    ADD COLUMN IF NOT EXISTS registered_at DATETIME DEFAULT NULL AFTER confidence_score;

-- Index for fast confidence lookups
CREATE INDEX IF NOT EXISTS idx_face_confidence ON face_profiles (confidence_score, verification_status);

-- Index for fast lookup of iot_logs by user
CREATE INDEX IF NOT EXISTS idx_iot_logs_user ON iot_logs (user_id);

-- Add manual_mode to iot_logs status enum if it doesn't already exist
-- (safe with IF NOT EXISTS fallback)
ALTER TABLE iot_logs 
    MODIFY COLUMN status ENUM(
        'matched', 'unknown', 'duplicate', 'no_schedule', 
        'rate_limited', 'error', 'manual_denied', 'spoof'
    ) NOT NULL;
