-- Add handicap index per year/player to scores table.
-- Handicap index is stored on each score row for the given year/player (same value for all courses that year).

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
ALTER TABLE scores ADD COLUMN handicap_index REAL;

-- 2022
UPDATE scores SET handicap_index = 4.5  WHERE year = 2022 AND player = 'Loop';
UPDATE scores SET handicap_index = 17.6 WHERE year = 2022 AND player = 'Boose';
UPDATE scores SET handicap_index = 8.1  WHERE year = 2022 AND player = 'Krass';
UPDATE scores SET handicap_index = 13.4 WHERE year = 2022 AND player = 'TK';
UPDATE scores SET handicap_index = 9.1  WHERE year = 2022 AND player = 'CTH';
UPDATE scores SET handicap_index = 11.1 WHERE year = 2022 AND player = 'Avayou';
UPDATE scores SET handicap_index = 5    WHERE year = 2022 AND player = 'Alex';
UPDATE scores SET handicap_index = 6.4  WHERE year = 2022 AND player = 'Huffman';

-- 2023
UPDATE scores SET handicap_index = 4.9  WHERE year = 2023 AND player = 'Loop';
UPDATE scores SET handicap_index = 19.5 WHERE year = 2023 AND player = 'Boose';
UPDATE scores SET handicap_index = 7.7  WHERE year = 2023 AND player = 'Krass';
UPDATE scores SET handicap_index = 14   WHERE year = 2023 AND player = 'TK';
UPDATE scores SET handicap_index = 9.3  WHERE year = 2023 AND player = 'CTH';
UPDATE scores SET handicap_index = 11.5 WHERE year = 2023 AND player = 'Avayou';
UPDATE scores SET handicap_index = 7.9  WHERE year = 2023 AND player = 'Alex';
UPDATE scores SET handicap_index = 8    WHERE year = 2023 AND player = 'Huffman';

-- 2024
UPDATE scores SET handicap_index = 4.8  WHERE year = 2024 AND player = 'Loop';
UPDATE scores SET handicap_index = 20.1 WHERE year = 2024 AND player = 'Boose';
UPDATE scores SET handicap_index = 8.4  WHERE year = 2024 AND player = 'Krass';
UPDATE scores SET handicap_index = 14.3 WHERE year = 2024 AND player = 'TK';
UPDATE scores SET handicap_index = 13.1 WHERE year = 2024 AND player = 'CTH';
UPDATE scores SET handicap_index = 11   WHERE year = 2024 AND player = 'Avayou';
UPDATE scores SET handicap_index = 7.6  WHERE year = 2024 AND player = 'Alex';
UPDATE scores SET handicap_index = 14.7 WHERE year = 2024 AND player = 'Jon';

-- 2025
UPDATE scores SET handicap_index = 4.5  WHERE year = 2025 AND player = 'Loop';
UPDATE scores SET handicap_index = 20.5 WHERE year = 2025 AND player = 'Boose';
UPDATE scores SET handicap_index = 7.4  WHERE year = 2025 AND player = 'Krass';
UPDATE scores SET handicap_index = 14.3 WHERE year = 2025 AND player = 'TK';
UPDATE scores SET handicap_index = 11.5 WHERE year = 2025 AND player = 'CTH';
UPDATE scores SET handicap_index = 11.7 WHERE year = 2025 AND player = 'Avayou';
UPDATE scores SET handicap_index = 6.8  WHERE year = 2025 AND player = 'Alex';
UPDATE scores SET handicap_index = 13.5 WHERE year = 2025 AND player = 'Jon';
