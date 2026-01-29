-- Fix positions with invalid price_basis (valid range is $1–$99, i.e. 100–9900 cents).
-- Invalid values can occur from a bug when transitioning long↔short (e.g. -1 @ $143).
UPDATE positions
SET price_basis = MAX(100, MIN(9900, price_basis))
WHERE net_position != 0 AND (price_basis > 9900 OR price_basis < 100);
