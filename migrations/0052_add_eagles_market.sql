-- Eagles market (Special Event): outcomes 1 or more, 2 or more
-- Uses market_type 'specials' so it appears under "Special Events" with Hole in One

INSERT OR IGNORE INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-eagles', 'Eagles', 'EAG', 1, 1, unixepoch(), 'specials');

INSERT OR IGNORE INTO outcomes (outcome_id, name, ticker, market_id, strike, settled_price, created_date) VALUES
  ('outcome-eagles-1-or-more', '1 or more', '1+', 'market-eagles', '0', NULL, unixepoch()),
  ('outcome-eagles-2-or-more', '2 or more', '2+', 'market-eagles', '0', NULL, unixepoch());
