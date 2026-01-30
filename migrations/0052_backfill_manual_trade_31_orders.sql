-- Backfill synthetic "filled" orders for the one admin manual trade (id 31) that was created
-- before we added order creation to the manual-trade flow. Idempotent: skips if orders already exist.

-- Taker order (user who took the trade)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
SELECT t.create_time, t.taker_user_id, 'manual-' || t.id || '-t', -t.id, t.outcome, t.price, 'filled', 'GTC', t.taker_side, 0, t.contracts
FROM trades t
WHERE t.id = 31
  AND t.taker_user_id IS NOT NULL
  AND t.outcome IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = -31 AND o.token = 'manual-31-t' LIMIT 1);

-- Maker order (user who was hit)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size, original_contract_size)
SELECT t.create_time, t.maker_user_id, 'manual-' || t.id || '-m', -t.id, t.outcome, t.price, 'filled', 'GTC', 1 - t.taker_side, 0, t.contracts
FROM trades t
WHERE t.id = 31
  AND t.maker_user_id IS NOT NULL
  AND t.outcome IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = -31 AND o.token = 'manual-31-m' LIMIT 1);
