-- Recreate courses table to remove UNIQUE constraint on name
-- SQLite doesn't support DROP CONSTRAINT, so we recreate the table

-- Create new table structure (without UNIQUE on name, allowing multiple tees per course)
CREATE TABLE IF NOT EXISTS courses_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  course_id INTEGER,
  tee_name TEXT,
  yardage INTEGER,
  course_rating REAL,
  slope INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Copy any existing data (if any)
INSERT INTO courses_new (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at FROM courses;

-- Drop old table and rename new one
DROP TABLE IF EXISTS courses;
ALTER TABLE courses_new RENAME TO courses;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_name_tee ON courses(name, tee_name) WHERE tee_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_course_id ON courses(course_id);

-- Insert all course tee data
-- Harbour Town Golf Links (course_id = 1)
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Harbour Town', 1, 'Blue', 6640, 73.3, 144);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Harbour Town', 1, 'White', 6248, 71.4, 136);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Harbour Town', 1, 'Gold', 5762, 69.6, 131);

-- Heron Point by Pete Dye (course_id = 2)
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Heron Point', 2, 'Blue', 6523, 72.0, 135);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Heron Point', 2, 'White', 6020, 70.2, 124);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Heron Point', 2, 'Gold', 5569, 68.0, 116);

-- George Fazio Course (Palmetto Dunes) -> Fazio (course_id = 3)
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Fazio', 3, 'Blue', 6534, 72.5, 142);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Fazio', 3, 'White', 6239, 71.0, 136);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Fazio', 3, 'Green', 5478, 67.8, 124);

-- Robert Trent Jones Course (Palmetto Dunes) -> RTJ (course_id = 4)
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('RTJ', 4, 'Blue', 6570, 72.8, 137);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('RTJ', 4, 'White', 6122, 70.6, 132);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('RTJ', 4, 'Green', 5035, 68.0, 123);

-- Hilton Head National (new course) (course_id = 5)
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Hilton Head National', 5, 'Blue', 6160, 70.0, 124);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Hilton Head National', 5, 'White', 5628, 68.0, 119);
INSERT INTO courses (name, course_id, tee_name, yardage, course_rating, slope) VALUES ('Hilton Head National', 5, 'Green', 5249, 66.0, 114);
