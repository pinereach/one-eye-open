-- Clear all trading data from production
-- Preserves: users, participants, scores, markets, outcomes
-- Deletes: orders, trades, positions

-- Delete all orders
DELETE FROM orders;

-- Delete all trades
DELETE FROM trades;

-- Delete all positions
DELETE FROM positions;

-- Note: This migration is NOT idempotent - it will delete data every time it runs
-- Use with caution! Make sure you have backups if needed.
