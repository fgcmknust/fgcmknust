-- Adds payment_method + payment_proof_url to the purchases table so we can
-- track the new MoMo + screenshot-upload checkout flow. Newly created
-- databases pick these columns up from schema.sql; existing prod databases
-- need this ALTER applied once.
--
-- Run on production:
--   wrangler d1 execute fgcm-db --remote --file=migrations/0002_add_purchases_manual_payment.sql

ALTER TABLE purchases ADD COLUMN payment_method TEXT;
ALTER TABLE purchases ADD COLUMN payment_proof_url TEXT;
