-- Drop unused tables
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS round_scores;
DROP TABLE IF EXISTS rounds;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS sessions;

-- Drop indexes for removed tables
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_token_hash;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_trip_members_trip_id;
DROP INDEX IF EXISTS idx_trip_members_user_id;
DROP INDEX IF EXISTS idx_rounds_trip_id;
DROP INDEX IF EXISTS idx_round_scores_round_id;
DROP INDEX IF EXISTS idx_round_scores_user_id;
DROP INDEX IF EXISTS idx_ledger_entries_trip_id;
DROP INDEX IF EXISTS idx_ledger_entries_user_id;

-- Update markets table - remove trip/round references
-- Note: We'll keep the table structure but remove foreign keys that reference dropped tables
-- The trip_id, round_id, subject_user_id columns can remain for now but won't be enforced

-- Create outcomes table
CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'settled', 'void')),
  settle_value INTEGER DEFAULT NULL CHECK(settle_value IS NULL OR settle_value IN (0, 10000)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
);

-- Update orders table to reference outcomes
-- Add outcome_id column (SQLite doesn't support adding foreign keys via ALTER TABLE)
-- The foreign key relationship will be enforced in application code
ALTER TABLE orders ADD COLUMN outcome_id TEXT;

-- Create indexes for outcomes
CREATE INDEX IF NOT EXISTS idx_outcomes_market_id ON outcomes(market_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_status ON outcomes(status);

-- Create index for orders on outcome_id
CREATE INDEX IF NOT EXISTS idx_orders_outcome_id ON orders(outcome_id);
