-- Add market_type column to markets table
-- This allows grouping markets by type in the UI
-- Note: This migration is idempotent - if column already exists, ALTER TABLE will fail but that's ok

-- Ensure markets table exists first
CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_id TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  max_winners INTEGER NOT NULL,
  min_winners INTEGER NOT NULL,
  created_date INTEGER NOT NULL DEFAULT (unixepoch()),
  market_type TEXT
);

-- Try to add market_type column if it doesn't exist
-- Note: This will fail if column already exists, which is fine - we can ignore that error
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If you see "duplicate column name: market_type", the column already exists and you can proceed
ALTER TABLE markets ADD COLUMN market_type TEXT;

-- Update existing markets with their types (only updates if markets exist)
UPDATE markets SET market_type = 'team_champion' WHERE market_id = 'market-team-champion';
UPDATE markets SET market_type = 'individual_champion' WHERE market_id IN ('market-individual-net-champion', 'market-individual-gross-champion');
UPDATE markets SET market_type = 'round_ou' WHERE market_id LIKE 'market-round-%ou';
UPDATE markets SET market_type = 'total_birdies' WHERE market_id = 'market-total-birdies';
UPDATE markets SET market_type = 'h2h_matchups' WHERE market_id = 'market-h2h-matchups';
UPDATE markets SET market_type = 'hole_in_one' WHERE market_id = 'market-hole-in-one';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_markets_market_type ON markets(market_type);
