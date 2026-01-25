-- Drop existing trades table and recreate with new schema
DROP TABLE IF EXISTS trades;

-- Create trades table with new schema
-- Note: SQLite uses INTEGER for auto-increment, and unixepoch() for timestamps
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  price INTEGER NOT NULL,
  contracts INTEGER NOT NULL,
  create_time INTEGER NOT NULL DEFAULT (unixepoch()),
  risk_off_contracts INTEGER NOT NULL DEFAULT 0,
  risk_off_price_diff INTEGER NOT NULL DEFAULT 0
);

-- Drop old indexes
DROP INDEX IF EXISTS idx_trades_market_id;
DROP INDEX IF EXISTS idx_trades_created_at;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token);
CREATE INDEX IF NOT EXISTS idx_trades_create_time ON trades(create_time);
CREATE INDEX IF NOT EXISTS idx_trades_price ON trades(price);
