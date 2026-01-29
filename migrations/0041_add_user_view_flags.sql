-- Add boolean flags to users table (SQLite: 0 = false, 1 = true). Default false.
ALTER TABLE users ADD COLUMN view_scores INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN view_market_maker INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN view_market_creation INTEGER NOT NULL DEFAULT 0;
