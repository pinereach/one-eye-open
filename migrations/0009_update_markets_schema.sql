-- Drop existing markets table and recreate with new schema
DROP TABLE IF EXISTS markets;

-- Create markets table with new schema
-- Note: SQLite uses INTEGER for auto-increment, and unixepoch() for timestamps
CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  max_winners INTEGER NOT NULL,
  min_winners INTEGER NOT NULL,
  created_date INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Drop old indexes
DROP INDEX IF EXISTS idx_markets_trip_id;
DROP INDEX IF EXISTS idx_markets_status;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_symbol ON markets(symbol);
