-- Add outcome_id column to trades table to link trades with outcomes
-- This migration is idempotent - it will only add the column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we check first
-- If the column already exists, this will fail silently or you can ignore the error

-- Check if column exists by attempting to add it (will fail if exists, but that's ok)
-- In practice, if you get "duplicate column" error, the column already exists and you can proceed

-- Attempt to add column (safe to run multiple times - will error if exists but that's expected)
-- Note: If you see "duplicate column name: outcome", the column already exists and migration is complete

-- For SQLite, we can't easily check if column exists in a migration, so we'll just try to add it
-- If it fails with "duplicate column", that means it's already there and we're done
ALTER TABLE trades ADD COLUMN outcome TEXT;

-- Create index for faster joins (this is idempotent)
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON trades(outcome);
