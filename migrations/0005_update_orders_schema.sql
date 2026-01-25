-- Drop existing orders table and recreate with new schema
DROP TABLE IF EXISTS orders;

-- Create orders table with new schema
-- Note: SQLite uses INTEGER for auto-increment, and unixepoch() for timestamps
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

-- Drop old indexes
DROP INDEX IF EXISTS idx_orders_market_id;
DROP INDEX IF EXISTS idx_orders_outcome_id;
DROP INDEX IF EXISTS idx_orders_market_side_price;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_outcome ON orders(outcome);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_side_price ON orders(side, price, create_time);
