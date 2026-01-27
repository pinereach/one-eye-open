-- Add original_contract_size column to orders table
-- This preserves the original order size so we can display it even after the order is filled
-- Note: This will fail if column already exists, which is fine

ALTER TABLE orders ADD COLUMN original_contract_size INTEGER;

-- Backfill: For existing orders
-- Strategy:
-- 1. For open/canceled orders: original_contract_size = contract_size (nothing filled yet)
-- 2. For partial orders: original_contract_size = contract_size + filled (estimate from trades)
-- 3. For filled orders: original_contract_size = sum of trades for that order

-- Step 1: Set original_contract_size = contract_size for open/canceled orders
UPDATE orders 
SET original_contract_size = contract_size 
WHERE original_contract_size IS NULL 
  AND status IN ('open', 'canceled');

-- Step 2: For partial orders, try to calculate original = remaining + filled
-- This is approximate - we sum trades matching outcome/price/user
UPDATE orders 
SET original_contract_size = (
  SELECT COALESCE(orders.contract_size, 0) + COALESCE(SUM(t.contracts), 0)
  FROM trades t
  WHERE t.outcome = orders.outcome
    AND t.price = orders.price
    AND EXISTS (
      SELECT 1 FROM orders o2
      WHERE o2.user_id = orders.user_id
        AND o2.outcome = t.outcome
        AND o2.price = t.price
        AND o2.status IN ('filled', 'partial')
    )
)
WHERE orders.status = 'partial'
  AND (original_contract_size IS NULL OR original_contract_size = 0)
  AND EXISTS (
    SELECT 1 FROM trades t
    WHERE t.outcome = orders.outcome
      AND t.price = orders.price
  );

-- Step 3: For filled orders, calculate original size from trades
-- This matches trades to orders by outcome, price, and user
-- Note: This is approximate and may not work perfectly if multiple orders match
UPDATE orders 
SET original_contract_size = (
  SELECT COALESCE(SUM(t.contracts), 0)
  FROM trades t
  WHERE t.outcome = orders.outcome
    AND t.price = orders.price
    AND EXISTS (
      SELECT 1 FROM orders o2
      WHERE o2.user_id = orders.user_id
        AND o2.outcome = t.outcome
        AND o2.price = t.price
        AND o2.status IN ('filled', 'partial')
    )
)
WHERE orders.status = 'filled' 
  AND (original_contract_size IS NULL OR original_contract_size = 0)
  AND EXISTS (
    SELECT 1 FROM trades t
    WHERE t.outcome = orders.outcome
      AND t.price = orders.price
  );

-- Step 4: For any remaining orders (that couldn't be matched to trades), 
-- set original_contract_size = contract_size as a fallback
UPDATE orders 
SET original_contract_size = contract_size 
WHERE original_contract_size IS NULL;
