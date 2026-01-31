-- Total Strokes market: total strokes for everyone on the trip over 6 rounds. Specials market type.
INSERT INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-total-strokes', 'Total Strokes', 'STROKES', 1, 1, unixepoch(), 'specials');

-- Outcomes: stroke range bands (one winner per band)
INSERT INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-total-strokes-lt-6499', 'Less than 6499', 'LT6499', 'market-total-strokes', '6499', NULL, unixepoch()),
  ('outcome-total-strokes-6500-6599', '6500-6599', '6500-6599', 'market-total-strokes', '6500-6599', NULL, unixepoch()),
  ('outcome-total-strokes-6600-6699', '6600-6699', '6600-6699', 'market-total-strokes', '6600-6699', NULL, unixepoch()),
  ('outcome-total-strokes-6700-6799', '6700-6799', '6700-6799', 'market-total-strokes', '6700-6799', NULL, unixepoch()),
  ('outcome-total-strokes-6800-6899', '6800-6899', '6800-6899', 'market-total-strokes', '6800-6899', NULL, unixepoch()),
  ('outcome-total-strokes-gt-6900', 'More than 6900', 'GT6900', 'market-total-strokes', '6900', NULL, unixepoch());
