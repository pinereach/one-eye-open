-- One-time: add system position so total closed_profit across all positions sums to 0 (fix historical imbalance).
-- Only inserts when no offset row exists and current sum of closed_profit is non-zero.
INSERT INTO positions (user_id, outcome, net_position, price_basis, closed_profit, settled_profit, is_settled, create_time)
SELECT NULL, '__closed_profit_offset', 0, 0, -(
  SELECT COALESCE(SUM(closed_profit), 0) FROM positions
), 0, 0, unixepoch()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE outcome = '__closed_profit_offset' AND user_id IS NULL)
  AND (SELECT COALESCE(SUM(closed_profit), 0) FROM positions) != 0;
