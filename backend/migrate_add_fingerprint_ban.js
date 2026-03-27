-- Migration: Add user_fingerprints table for device fingerprint tracking and banning
CREATE TABLE user_fingerprints (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL, -- Device ID from FingerprintJS
    user_agent TEXT,
    ip_address TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    login_count INT DEFAULT 1,
    is_blocked BOOLEAN DEFAULT false,
    ban_until TIMESTAMPTZ,
    UNIQUE(user_id, fingerprint)
);

-- Index for fast fingerprint lookups
CREATE INDEX idx_fingerprint ON user_fingerprints(fingerprint);