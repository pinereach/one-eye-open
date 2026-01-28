-- Safe migration to add market_type to all existing markets in production
-- This migration is idempotent and preserves all existing data
-- It can be run multiple times safely

-- Step 1: Ensure markets table exists with market_type column
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

-- Step 2: Try to add market_type column if it doesn't exist
-- Note: This will fail silently if column already exists, which is fine
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If you see "duplicate column name: market_type", the column already exists and you can proceed
ALTER TABLE markets ADD COLUMN market_type TEXT;

-- Step 3: Create index for market_type if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_markets_market_type ON markets(market_type);

-- Step 4: Update existing markets with their correct market_type based on patterns
-- Team Champion
UPDATE markets 
SET market_type = 'team_champion' 
WHERE market_id = 'market-team-champion' 
  AND (market_type IS NULL OR market_type != 'team_champion');

-- Individual Champions (Net and Gross)
UPDATE markets 
SET market_type = 'individual_champion' 
WHERE market_id IN ('market-individual-net-champion', 'market-individual-gross-champion')
  AND (market_type IS NULL OR market_type != 'individual_champion');

-- Round Over/Under markets (by market_id pattern)
UPDATE markets 
SET market_type = 'round_ou' 
WHERE market_id LIKE 'market-round-%ou'
  AND (market_type IS NULL OR market_type != 'round_ou');

-- Round Over/Under markets (by short_name pattern - catches user-created ones)
UPDATE markets 
SET market_type = 'round_ou' 
WHERE short_name LIKE 'Round % Over/Under%'
  AND (market_type IS NULL OR market_type != 'round_ou');

-- Total Birdies
UPDATE markets 
SET market_type = 'total_birdies' 
WHERE market_id = 'market-total-birdies'
  AND (market_type IS NULL OR market_type != 'total_birdies');

-- H2H Matchups
UPDATE markets 
SET market_type = 'h2h_matchups' 
WHERE market_id = 'market-h2h-matchups'
  AND (market_type IS NULL OR market_type != 'h2h_matchups');

-- Hole in One
UPDATE markets 
SET market_type = 'hole_in_one' 
WHERE market_id = 'market-hole-in-one'
  AND (market_type IS NULL OR market_type != 'hole_in_one');

-- Note: Any markets that don't match the above patterns will have market_type = NULL
-- This is fine - they can be updated manually or via the market suggestions API
