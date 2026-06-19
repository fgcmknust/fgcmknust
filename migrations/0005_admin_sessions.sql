-- Admin session table.
-- The admin auth model moves from "send the secret Bearer on every request
-- from JS-readable sessionStorage" to "Bearer once to log in, then we set an
-- HttpOnly cookie holding a short-lived session ID that JS cannot read."
-- This single column is what makes revoke-on-logout and TTL enforcement
-- possible without a stateful Worker.

-- Run once on production:
--   wrangler d1 execute fgcm-db --remote --file=migrations/0005_admin_sessions.sql

CREATE TABLE IF NOT EXISTS admin_sessions (
  -- SHA-256 hex of the raw session ID. We never store the raw value, so a
  -- DB leak does NOT yield usable session tokens — same hygiene as password
  -- hashing.
  session_hash TEXT PRIMARY KEY,
  -- Unix ms when this session becomes invalid. Selected against in the
  -- middleware so expired sessions are rejected without a cleanup cron.
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  -- Recorded once at login for audit; not used for trust decisions.
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
