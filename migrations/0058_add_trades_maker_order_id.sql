-- Add maker_order_id to trades so backout can reinstate the resting (maker) order.
ALTER TABLE trades ADD COLUMN maker_order_id INTEGER;
