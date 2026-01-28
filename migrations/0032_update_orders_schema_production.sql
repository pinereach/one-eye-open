-- Migration to update orders and trades tables schema from old format to new format
-- This is safe to run since trading data has been cleared
-- 
-- Orders table:
-- Old schema: id TEXT, side TEXT ('bid'/'ask'), price_cents, qty_contracts, qty_remaining, created_at
-- New schema: id INTEGER, side INTEGER (0/1), price, contract_size, create_time, outcome, token, order_id, tif
--
-- Trades table:
-- Old schema: id TEXT, market_id, taker_order_id, maker_order_id, price_cents, qty_contracts, created_at
-- New schema: id INTEGER, token, price, contracts, create_time, risk_off_contracts, risk_off_price_diff, outcome

-- Drop old orders table (safe since data was cleared)
DROP TABLE IF EXISTS orders;

-- Create new orders table with correct schema
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
  contract_size INTEGER,
  original_contract_size INTEGER
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_outcome ON orders(outcome);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_side_price ON orders(side, price, create_time);

-- Drop old trades table (safe since data was cleared)
DROP TABLE IF EXISTS trades;

-- Create new trades table with correct schema
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  price INTEGER NOT NULL,
  contracts INTEGER NOT NULL,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  risk_off_contracts INTEGER NOT NULL DEFAULT 0,
  risk_off_price_diff INTEGER NOT NULL DEFAULT 0,
  outcome TEXT
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token);
CREATE INDEX IF NOT EXISTS idx_trades_create_time ON trades(create_time);
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON trades(outcome);
