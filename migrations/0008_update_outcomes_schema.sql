-- Drop existing outcomes table and recreate with new schema
DROP TABLE IF EXISTS outcomes;

-- Create outcomes table with new schema
-- Note: SQLite uses INTEGER for auto-increment, and unixepoch() for timestamps
CREATE TABLE IF NOT EXISTS outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outcome_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  market_id TEXT NOT NULL,
  strike TEXT NOT NULL,
  settled_price INTEGER,
  created_date INTEGER NOT NULL DEFAULT (unixepoch())
  -- Note: Foreign key to markets.market_id (text) would be ideal, but SQLite doesn't support foreign keys to non-primary keys
  -- Application code will enforce the relationship using market_id (text) for lookups
);

-- Drop old indexes
DROP INDEX IF EXISTS idx_outcomes_market_id;
DROP INDEX IF EXISTS idx_outcomes_status;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_id ON outcomes(outcome_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_market_id ON outcomes(market_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_ticker ON outcomes(ticker);
