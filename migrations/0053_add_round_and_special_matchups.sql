-- Round Matchups and Special Matchups (outcomes added by users/suggestions, like H2H)
-- Uses market_type 'matchups' so they appear under "Matchups" with H2H

INSERT OR IGNORE INTO markets (market_id, short_name, symbol, max_winners, min_winners, created_date, market_type) VALUES
  ('market-round-matchups', 'Round Matchups', 'ROUND-MU', 1, 1, unixepoch(), 'matchups'),
  ('market-special-matchups', 'Special Matchups', 'SPEC-MU', 1, 1, unixepoch(), 'matchups');
