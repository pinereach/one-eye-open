-- Simple migration to create outcomes table only
-- Run this first, then run 0021_add_outcome_to_trades.sql separately for the trades column

-- Create outcomes table if it doesn't exist
CREATE TABLE IF NOT EXISTS outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outcome_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  market_id TEXT NOT NULL,
  strike TEXT NOT NULL,
  settled_price INTEGER,
  created_date INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_id ON outcomes(outcome_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_market_id ON outcomes(market_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_created_date ON outcomes(created_date);

-- Ensure markets table exists with correct schema
CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  max_winners INTEGER NOT NULL,
  min_winners INTEGER NOT NULL,
  created_date INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
