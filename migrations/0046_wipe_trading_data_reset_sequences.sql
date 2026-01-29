-- Wipe orders, trades, and positions for a clean reset.
-- Resets SQLite autoincrement sequences so new rows start at 1.
-- Preserves: users, participants, scores, markets, outcomes.

-- Delete all trading data
DELETE FROM orders;
DELETE FROM trades;
DELETE FROM positions;

-- Reset sequences (SQLite stores AUTOINCREMENT next value in sqlite_sequence)
DELETE FROM sqlite_sequence WHERE name IN ('orders', 'trades', 'positions');
