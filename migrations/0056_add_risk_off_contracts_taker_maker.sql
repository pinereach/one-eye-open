-- Add per-side risk-off contract counts so trade log can show taker vs maker closed contracts.
-- risk_off_contracts remains the total (taker + maker); new columns give the breakdown.

ALTER TABLE trades ADD COLUMN risk_off_contracts_taker INTEGER NOT NULL DEFAULT 0;
ALTER TABLE trades ADD COLUMN risk_off_contracts_maker INTEGER NOT NULL DEFAULT 0;
