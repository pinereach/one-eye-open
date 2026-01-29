-- One-off fix: correct price_basis for a position that was updated with wrong maker-side logic.
-- User had: trade 1 = bought 1 @ 70 (7000), trade 2 = sold 2 @ 73 (7300) → net -1, correct basis = 73 (7300 cents).
-- Stored value was 14300 (bug: maker position was recorded as buy instead of sell, or old averaging bug).
-- Fix: set price_basis = 7300 for outcome-gross-champion-loop, user_id 2, net_position -1.
UPDATE positions
SET price_basis = 7300
WHERE outcome = 'outcome-gross-champion-loop'
  AND user_id = 2
  AND net_position = -1
  AND price_basis != 7300;
