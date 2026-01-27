-- Create scores table
-- Stores historical scoring data: Course, Year, Player, Score
-- Index column can be used for ordering players within a round if needed

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course TEXT NOT NULL,
  year INTEGER NOT NULL,
  player TEXT NOT NULL,
  score INTEGER,
  index_number INTEGER, -- Optional: for ordering players within a course/year
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(course, year, player)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scores_course_year ON scores(course, year);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player);
