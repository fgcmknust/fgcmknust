-- Force the Keepers of The Flame T-shirt row into the products table.
--
-- This is the product ID baked into src/data/products.js — when D1 is empty
-- (fresh deploy, table cleared, accidentally deleted via the admin form) the
-- /api/pay/manual-confirm endpoint returns "Unknown product in cart" because
-- the server price-recompute can't find any matching row. Run this once per
-- environment that exhibits the error:
--
--   wrangler d1 execute fgcm-db --remote --file=migrations/0003_seed_keepers_tshirt.sql
--
-- Safe to re-run: INSERT OR REPLACE rewrites the row with the canonical values.

INSERT OR REPLACE INTO products (
  id, name, price, description, image_url, sizes_json, colors_json, category, is_featured
) VALUES (
  '0188b8e0-1234-7abc-8def-000000000010',
  'Keepers of The Flame T-shirt',
  60,
  'T-shirt used for the Keepers of the Flame event.',
  '/images/merch.jpg',
  '["S", "M", "L", "XL", "XXL", "3XL"]',
  '["Black", "White", "Light Green"]',
  'T-Shirts',
  1
);
