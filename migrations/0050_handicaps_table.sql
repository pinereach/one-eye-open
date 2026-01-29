-- Create handicaps table: one row per (player, year) for years 2022-2026.
-- Migrate existing handicap data from scores, then remove handicap_index from scores.

CREATE TABLE IF NOT EXISTS handicaps (
  player TEXT NOT NULL,
  year INTEGER NOT NULL,
  handicap_index REAL,
  PRIMARY KEY (player, year)
);

CREATE INDEX IF NOT EXISTS idx_handicaps_year ON handicaps(year);

-- Migrate existing handicap data from scores (2022-2025 from 0037)
INSERT OR IGNORE INTO handicaps (player, year, handicap_index)
SELECT DISTINCT player, year, handicap_index FROM scores WHERE handicap_index IS NOT NULL;

-- Backfill full grid: 12 players × years 2022-2026 (missing data stays NULL)
INSERT OR IGNORE INTO handicaps (player, year, handicap_index) VALUES
  ('Loop', 2022, NULL), ('Loop', 2023, NULL), ('Loop', 2024, NULL), ('Loop', 2025, NULL), ('Loop', 2026, NULL),
  ('Boose', 2022, NULL), ('Boose', 2023, NULL), ('Boose', 2024, NULL), ('Boose', 2025, NULL), ('Boose', 2026, NULL),
  ('Krass', 2022, NULL), ('Krass', 2023, NULL), ('Krass', 2024, NULL), ('Krass', 2025, NULL), ('Krass', 2026, NULL),
  ('TK', 2022, NULL), ('TK', 2023, NULL), ('TK', 2024, NULL), ('TK', 2025, NULL), ('TK', 2026, NULL),
  ('CTH', 2022, NULL), ('CTH', 2023, NULL), ('CTH', 2024, NULL), ('CTH', 2025, NULL), ('CTH', 2026, NULL),
  ('Avayou', 2022, NULL), ('Avayou', 2023, NULL), ('Avayou', 2024, NULL), ('Avayou', 2025, NULL), ('Avayou', 2026, NULL),
  ('Alex', 2022, NULL), ('Alex', 2023, NULL), ('Alex', 2024, NULL), ('Alex', 2025, NULL), ('Alex', 2026, NULL),
  ('Huffman', 2022, NULL), ('Huffman', 2023, NULL), ('Huffman', 2024, NULL), ('Huffman', 2025, NULL), ('Huffman', 2026, NULL),
  ('Jon', 2022, NULL), ('Jon', 2023, NULL), ('Jon', 2024, NULL), ('Jon', 2025, NULL), ('Jon', 2026, NULL),
  ('Tim', 2022, NULL), ('Tim', 2023, NULL), ('Tim', 2024, NULL), ('Tim', 2025, NULL), ('Tim', 2026, NULL),
  ('Doc', 2022, NULL), ('Doc', 2023, NULL), ('Doc', 2024, NULL), ('Doc', 2025, NULL), ('Doc', 2026, NULL),
  ('Will', 2022, NULL), ('Will', 2023, NULL), ('Will', 2024, NULL), ('Will', 2025, NULL), ('Will', 2026, NULL);

-- Remove handicap from scores table
ALTER TABLE scores DROP COLUMN handicap_index;
