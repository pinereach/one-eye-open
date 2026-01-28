-- Add course_id to scores table and map existing scores to courses
-- Also add Hilton Head National scores for all years

-- Add course_id column to scores
ALTER TABLE scores ADD COLUMN course_id INTEGER;

-- Create index for course_id lookups
CREATE INDEX IF NOT EXISTS idx_scores_course_id ON scores(course_id);

-- Map existing scores to course_id based on course name
-- Harbour Town -> course_id 1
UPDATE scores SET course_id = 1 WHERE course = 'Harbour Town';

-- Heron Point -> course_id 2
UPDATE scores SET course_id = 2 WHERE course = 'Heron Point';

-- Fazio -> course_id 3
UPDATE scores SET course_id = 3 WHERE course = 'Fazio';

-- RTJ -> course_id 4
UPDATE scores SET course_id = 4 WHERE course = 'RTJ';

-- Hills -> course_id 6 (assuming Hills is a separate course, not in courses table yet)
-- If Hills should map to something else, update this
UPDATE scores SET course_id = 6 WHERE course = 'Hills';

-- Add Hilton Head National scores for all years (2022-2026)
-- Players: Loop, Boose, Krass, TK, CTH, Avayou, Alex, Huffman, Jon (Jon from 2024+)

-- Hilton Head National 2022
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Loop', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Boose', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Krass', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'TK', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'CTH', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Avayou', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Alex', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2022, 'Huffman', NULL);

-- Hilton Head National 2023
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Loop', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Boose', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Krass', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'TK', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'CTH', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Avayou', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Alex', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2023, 'Huffman', NULL);

-- Hilton Head National 2024
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Loop', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Boose', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Krass', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'TK', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'CTH', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Avayou', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Alex', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2024, 'Jon', NULL);

-- Hilton Head National 2025
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Loop', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Boose', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Krass', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'TK', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'CTH', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Avayou', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Alex', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2025, 'Jon', NULL);

-- Hilton Head National 2026
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Loop', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Boose', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Krass', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'TK', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'CTH', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Avayou', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Alex', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Huffman', NULL);
INSERT OR IGNORE INTO scores (course, course_id, year, player, score) VALUES ('Hilton Head National', 5, 2026, 'Jon', NULL);
