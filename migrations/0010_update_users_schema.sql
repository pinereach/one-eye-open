-- Drop existing users table and recreate with new schema
DROP TABLE IF EXISTS users;

-- Create users table with new simplified schema
-- Note: SQLite uses INTEGER for auto-increment
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Drop old indexes
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_sessions_token_hash;
DROP INDEX IF EXISTS idx_sessions_expires_at;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
