-- Participants table
-- These are the people playing in the betting markets
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create index for participant lookups
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
