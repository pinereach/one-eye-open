-- Quick setup for local development
-- Creates all necessary tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);

-- Markets table
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
CREATE INDEX IF NOT EXISTS idx_markets_market_id ON markets(market_id);
CREATE INDEX IF NOT EXISTS idx_markets_market_type ON markets(market_type);

-- Outcomes table
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

-- Orders table
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
  side INTEGER NOT NULL CHECK(side IN (0, 1)),
  contract_size INTEGER
);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_outcome ON orders(outcome);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  price INTEGER NOT NULL,
  contracts INTEGER NOT NULL,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  risk_off_contracts INTEGER NOT NULL DEFAULT 0,
  risk_off_price_diff INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_trades_create_time ON trades(create_time);

-- Positions table
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
