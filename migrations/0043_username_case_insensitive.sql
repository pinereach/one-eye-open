-- Usernames are case-insensitive: enforce uniqueness on LOWER(username).
-- If you have duplicate usernames that differ only by case (e.g. "John" and "john"),
-- resolve them before running this migration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
