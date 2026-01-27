-- Reset database with stable test data for REMOTE database
-- This migration works with the remote database schema which uses:
-- - id (TEXT), market_id (TEXT), user_id (TEXT), side (TEXT 'bid'/'ask')
-- - price_cents (INTEGER), qty_contracts (INTEGER), qty_remaining (INTEGER)
-- - status (TEXT), created_at (INTEGER)
-- Note: Remote schema doesn't have outcome column, only market_id

-- Delete all existing orders (except user orders if you want to keep them)
-- Uncomment the line below if you want to delete ALL orders including user orders
-- DELETE FROM orders;

-- Delete only mock orders (keeps user orders)
-- Delete by user_id IS NULL (mock orders have NULL user_id)
DELETE FROM orders WHERE user_id IS NULL;

-- Insert stable mock orderbook data
-- All prices are whole numbers 1-99 dollars (100-9900 cents)
-- Gap between best bid and best ask is always 2 dollars (200 cents)
-- Note: Since remote schema doesn't have outcome, we insert by market_id only

-- Market: market-team-champion
-- Best bid $18 (1800 cents), best ask $20 (2000 cents) - 2 dollar gap
INSERT INTO orders (id, market_id, user_id, side, price_cents, qty_contracts, qty_remaining, status, created_at) VALUES
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'bid', 1800, 10, 10, 'open', unixepoch()),
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'bid', 1700, 15, 15, 'open', unixepoch()),
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'bid', 1600, 20, 20, 'open', unixepoch()),
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'ask', 2000, 12, 12, 'open', unixepoch()),
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'ask', 2100, 18, 18, 'open', unixepoch()),
  (lower(hex(randomblob(16))), 'market-team-champion', NULL, 'ask', 2200, 22, 22, 'open', unixepoch());
