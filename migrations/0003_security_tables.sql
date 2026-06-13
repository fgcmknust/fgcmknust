-- Rate-limit buckets. One row per (action + identifier) pair.
-- `window_start` is unix-ms; rows older than the limiter window are reset on next hit.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
