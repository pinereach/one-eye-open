-- Cached 30-day volume per market. Refresh via cron/admin every 4h to avoid scanning trades on every GET /api/markets.
CREATE TABLE IF NOT EXISTS market_volume (
  market_id TEXT PRIMARY KEY,
  volume_contracts INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (market_id) REFERENCES markets(market_id)
);
