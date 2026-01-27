-- Complete schema update and cleanup
-- This migration ensures all tables are in their final state

-- Step 1: Clean up old tables
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS rounds;
DROP TABLE IF EXISTS round_scores;
DROP TABLE IF EXISTS ledger_entries;

-- Step 2: Drop old indexes
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

-- Step 3: Recreate users table with new schema
DROP TABLE IF EXISTS users;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Step 4: Recreate markets table with new schema
DROP TABLE IF EXISTS markets;
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
CREATE INDEX IF NOT EXISTS idx_markets_created_date ON markets(created_date);

-- Step 5: Recreate outcomes table with new schema
DROP TABLE IF EXISTS outcomes;
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

-- Step 6: Recreate orders table with new schema
DROP TABLE IF EXISTS orders;
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  user_id INTEGER,
  token TEXT NOT NULL,
  order_id INTEGER NOT NULL DEFAULT -1,
  outcome TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('open', 'partial', 'filled', 'canceled')),
  tif TEXT NOT NULL,
  side INTEGER NOT NULL CHECK(side IN (0, 1)), -- 0 = bid, 1 = ask
  contract_size INTEGER
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_outcome ON orders(outcome);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_side_price ON orders(side, price, create_time);

-- Step 7: Recreate trades table with new schema
DROP TABLE IF EXISTS trades;
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  price INTEGER NOT NULL,
  contracts INTEGER NOT NULL,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  risk_off_contracts INTEGER NOT NULL DEFAULT 0,
  risk_off_price_diff INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token);
CREATE INDEX IF NOT EXISTS idx_trades_create_time ON trades(create_time);

-- Step 8: Recreate positions table with new schema
DROP TABLE IF EXISTS positions;
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
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_outcome ON positions(outcome);
CREATE INDEX IF NOT EXISTS idx_positions_user_outcome ON positions(user_id, outcome);

-- Step 9: Ensure participants table exists (should already exist from 0004)
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
