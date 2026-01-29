-- Add trading_paused flag to markets (SQLite: 0 = false, 1 = true). Default false.
ALTER TABLE markets ADD COLUMN trading_paused INTEGER NOT NULL DEFAULT 0;
