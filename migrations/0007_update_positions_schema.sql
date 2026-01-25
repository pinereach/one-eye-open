-- Drop existing positions table and recreate with new schema
DROP TABLE IF EXISTS positions;

-- Create positions table with new schema
-- Note: SQLite uses INTEGER for auto-increment, unixepoch() for timestamps, and INTEGER (0/1) for booleans
CREATE TABLE IF NOT EXISTS positions (
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

-- Drop old indexes
DROP INDEX IF EXISTS idx_positions_market_id;
DROP INDEX IF EXISTS idx_positions_user_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_outcome ON positions(outcome);
CREATE INDEX IF NOT EXISTS idx_positions_user_outcome ON positions(user_id, outcome);
