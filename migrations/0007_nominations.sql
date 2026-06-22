CREATE TABLE IF NOT EXISTS nominations (
  id           TEXT    PRIMARY KEY,
  first_name   TEXT    NOT NULL,
  middle_name  TEXT,
  last_name    TEXT    NOT NULL,
  phone        TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  role         TEXT    NOT NULL,
  statement    TEXT    NOT NULL,
  submitted_at INTEGER NOT NULL,
  UNIQUE(phone, role)
);

CREATE INDEX IF NOT EXISTS idx_nominations_role      ON nominations(role);
CREATE INDEX IF NOT EXISTS idx_nominations_submitted ON nominations(submitted_at);
