-- Comprehensive cleanup of old tables and indexes
-- This migration ensures all old/unused tables are removed

-- Drop old tables that should have been removed
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS rounds;
DROP TABLE IF EXISTS round_scores;
DROP TABLE IF EXISTS ledger_entries;

-- Drop old indexes for removed tables
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

-- Drop old indexes that may have been created with old table schemas
-- (These will be recreated by the schema update migrations if needed)
DROP INDEX IF EXISTS idx_markets_trip_id;
DROP INDEX IF EXISTS idx_markets_status;
DROP INDEX IF EXISTS idx_orders_market_id;
DROP INDEX IF EXISTS idx_orders_outcome_id;
DROP INDEX IF EXISTS idx_orders_market_side_price;
DROP INDEX IF EXISTS idx_trades_market_id;
DROP INDEX IF EXISTS idx_trades_created_at;
DROP INDEX IF EXISTS idx_positions_market_id;
DROP INDEX IF EXISTS idx_outcomes_market_id;
DROP INDEX IF EXISTS idx_outcomes_status;

-- Note: The actual tables (users, markets, outcomes, orders, trades, positions, participants)
-- should be recreated by their respective schema update migrations (0005-0010).
-- If you're seeing old versions of these tables, make sure you've run all migrations in order.
