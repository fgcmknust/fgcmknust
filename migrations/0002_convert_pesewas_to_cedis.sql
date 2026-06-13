-- Migration: Convert stored amounts from pesewas to cedis (one-time).
-- WARNING: Review and back up your database before running.
--
-- This migration uses a flag table to make itself idempotent so it cannot be
-- accidentally re-applied (which would divide already-cedi prices by 100).

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS migration_flags (
  name TEXT PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Only run the conversion if the flag is not yet set.
INSERT INTO migration_flags(name)
SELECT 'pesewas_to_cedis_v1'
WHERE NOT EXISTS (SELECT 1 FROM migration_flags WHERE name = 'pesewas_to_cedis_v1');

-- The heuristic (> 100) assumes legacy values were stored as pesewas (>= 100 = at
-- least 1 cedi). Verify with a SELECT before relying on this in production.
UPDATE products
SET price = price / 100.0
WHERE price > 100
  AND EXISTS (SELECT 1 FROM migration_flags WHERE name = 'pesewas_to_cedis_v1' AND applied_at = (SELECT applied_at FROM migration_flags WHERE name = 'pesewas_to_cedis_v1'))
  AND (SELECT COUNT(*) FROM migration_flags WHERE name = 'pesewas_to_cedis_v1') = 1;

UPDATE purchases
SET amount = amount / 100.0
WHERE amount > 100
  AND EXISTS (SELECT 1 FROM migration_flags WHERE name = 'pesewas_to_cedis_v1' AND applied_at = (SELECT applied_at FROM migration_flags WHERE name = 'pesewas_to_cedis_v1'))
  AND (SELECT COUNT(*) FROM migration_flags WHERE name = 'pesewas_to_cedis_v1') = 1;

COMMIT;
