-- Add admin boolean flag to users table (SQLite: 0 = false, 1 = true). Default false.
ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0;
