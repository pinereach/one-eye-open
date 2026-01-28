-- Production fix: positions table in production still has OLD schema (market_id, qty_long, qty_short).
-- The app expects NEW schema (outcome, net_position, price_basis, closed_profit, etc.).
-- This migration drops the old table and creates the new one.
--
-- WARNING: This deletes all existing position rows. If you have data to keep,
-- export it first. After this, new trades will correctly create/update positions.

DROP TABLE IF EXISTS positions;

CREATE TABLE positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  outcome TEXT NOT NULL,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  closed_profit INTEGER NOT NULL DEFAULT 0,
  settled_profit INTEGER NOT NULL DEFAULT 0,
  net_position INTEGER NOT NULL DEFAULT 0,
  price_basis INTEGER NOT NULL DEFAULT 0,
  is_settled INTEGER NOT NULL DEFAULT 0 CHECK(is_settled IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_outcome ON positions(outcome);
CREATE INDEX IF NOT EXISTS idx_positions_user_outcome ON positions(user_id, outcome);
