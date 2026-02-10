-- Use only explicit taker/maker columns: no shared risk_off_contracts or risk_off_price_diff.
-- risk_off_price_diff → risk_off_price_diff_taker; drop risk_off_contracts (keep _taker and _maker).
-- Requires SQLite 3.35+ (DROP COLUMN). Cloudflare D1 is compatible.

-- 1. Add taker price-diff column and migrate data from legacy risk_off_price_diff
ALTER TABLE trades ADD COLUMN risk_off_price_diff_taker INTEGER NOT NULL DEFAULT 0;
UPDATE trades SET risk_off_price_diff_taker = COALESCE(risk_off_price_diff, 0);

-- 2. Drop legacy columns (taker/maker contract columns already exist from 0056)
ALTER TABLE trades DROP COLUMN risk_off_price_diff;
ALTER TABLE trades DROP COLUMN risk_off_contracts;
