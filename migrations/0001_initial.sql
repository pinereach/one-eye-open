-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Trip members table
CREATE TABLE IF NOT EXISTS trip_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player', 'observer', 'admin')),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(trip_id, user_id)
);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  round_no INTEGER NOT NULL CHECK(round_no >= 1 AND round_no <= 5),
  name TEXT NOT NULL,
  date INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  UNIQUE(trip_id, round_no)
);

-- Round scores table
CREATE TABLE IF NOT EXISTS round_scores (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cross_score INTEGER,
  net_score INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(round_id, user_id)
);

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('TEAM_OVERALL_WINNER', 'ROUND_OU_PERSON', 'BIRDIES_OU_PLAYER_ROUND', 'HOLE_IN_ONE_TRIP')),
  round_id TEXT,
  subject_user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'settled', 'void')),
  settle_value INTEGER DEFAULT NULL CHECK(settle_value IS NULL OR settle_value IN (0, 10000)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE SET NULL,
  FOREIGN KEY (subject_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('bid', 'ask')),
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0 AND price_cents <= 10000),
  qty_contracts INTEGER NOT NULL CHECK(qty_contracts > 0),
  qty_remaining INTEGER NOT NULL CHECK(qty_remaining >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'partial', 'filled', 'canceled')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  taker_order_id TEXT NOT NULL,
  maker_order_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0 AND price_cents <= 10000),
  qty_contracts INTEGER NOT NULL CHECK(qty_contracts > 0),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE,
  FOREIGN KEY (taker_order_id) REFERENCES orders(id),
  FOREIGN KEY (maker_order_id) REFERENCES orders(id)
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  qty_long INTEGER NOT NULL DEFAULT 0 CHECK(qty_long >= 0),
  qty_short INTEGER NOT NULL DEFAULT 0 CHECK(qty_short >= 0),
  avg_price_long_cents INTEGER,
  avg_price_short_cents INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(market_id, user_id)
);

-- Ledger entries table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  counterparty_user_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counterparty_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_trip_id ON rounds(trip_id);
CREATE INDEX IF NOT EXISTS idx_round_scores_round_id ON round_scores(round_id);
CREATE INDEX IF NOT EXISTS idx_round_scores_user_id ON round_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_markets_trip_id ON markets(trip_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_orders_market_id ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_market_side_price ON orders(market_id, side, price_cents, created_at);
CREATE INDEX IF NOT EXISTS idx_trades_market_id ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_positions_market_id ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_trip_id ON ledger_entries(trip_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
