-- Hot-query indexes: orderbook (outcome + side + status + sort), tape and positions/handicaps already covered.
-- Orderbook: WHERE outcome IN (...) AND side = ? AND status IN ('open','partial') ORDER BY price [DESC|ASC], create_time ASC
CREATE INDEX IF NOT EXISTS idx_orders_outcome_side_status_price_time ON orders(outcome, side, status, price, create_time);
