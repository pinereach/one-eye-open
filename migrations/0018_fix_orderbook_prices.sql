-- Fix orderbook prices so asks sum to 100% and bids are 1-2% below asks
-- First, delete existing mock orders
DELETE FROM orders WHERE token LIKE 'mock-token-%';

-- Loop & Boose - Ask 20% ($20), Bid 18% ($18) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  -- Bids (buying Yes) - highest bid first, whole dollars only
  (unixepoch(), NULL, 'mock-token-1', -1, 'outcome-team-champion-loop-boose', 1800, 'open', 'GTC', 0, 10),
  (unixepoch(), NULL, 'mock-token-2', -1, 'outcome-team-champion-loop-boose', 1700, 'open', 'GTC', 0, 15),
  (unixepoch(), NULL, 'mock-token-3', -1, 'outcome-team-champion-loop-boose', 1600, 'open', 'GTC', 0, 20),
  -- Asks (selling Yes / buying No) - lowest ask first, whole dollars only, 2 dollar gap from best bid
  (unixepoch(), NULL, 'mock-token-4', -1, 'outcome-team-champion-loop-boose', 2000, 'open', 'GTC', 1, 12),
  (unixepoch(), NULL, 'mock-token-5', -1, 'outcome-team-champion-loop-boose', 2100, 'open', 'GTC', 1, 18),
  (unixepoch(), NULL, 'mock-token-6', -1, 'outcome-team-champion-loop-boose', 2200, 'open', 'GTC', 1, 22);

-- Krass & TK - Ask 18% ($18), Bid 16% ($16) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-7', -1, 'outcome-team-champion-krass-tk', 1600, 'open', 'GTC', 0, 8),
  (unixepoch(), NULL, 'mock-token-8', -1, 'outcome-team-champion-krass-tk', 1500, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-9', -1, 'outcome-team-champion-krass-tk', 1400, 'open', 'GTC', 0, 15),
  (unixepoch(), NULL, 'mock-token-10', -1, 'outcome-team-champion-krass-tk', 1800, 'open', 'GTC', 1, 10),
  (unixepoch(), NULL, 'mock-token-11', -1, 'outcome-team-champion-krass-tk', 1900, 'open', 'GTC', 1, 14),
  (unixepoch(), NULL, 'mock-token-12', -1, 'outcome-team-champion-krass-tk', 2000, 'open', 'GTC', 1, 18);

-- CTH & Avayou - Ask 17% ($17), Bid 15% ($15) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-13', -1, 'outcome-team-champion-cth-avayou', 1500, 'open', 'GTC', 0, 5),
  (unixepoch(), NULL, 'mock-token-14', -1, 'outcome-team-champion-cth-avayou', 1400, 'open', 'GTC', 0, 8),
  (unixepoch(), NULL, 'mock-token-15', -1, 'outcome-team-champion-cth-avayou', 1300, 'open', 'GTC', 0, 10),
  (unixepoch(), NULL, 'mock-token-16', -1, 'outcome-team-champion-cth-avayou', 1700, 'open', 'GTC', 1, 6),
  (unixepoch(), NULL, 'mock-token-17', -1, 'outcome-team-champion-cth-avayou', 1800, 'open', 'GTC', 1, 9),
  (unixepoch(), NULL, 'mock-token-18', -1, 'outcome-team-champion-cth-avayou', 1900, 'open', 'GTC', 1, 12);

-- Alex & Huffman - Ask 17% ($17), Bid 15% ($15) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-19', -1, 'outcome-team-champion-alex-huffman', 1500, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-20', -1, 'outcome-team-champion-alex-huffman', 1400, 'open', 'GTC', 0, 16),
  (unixepoch(), NULL, 'mock-token-21', -1, 'outcome-team-champion-alex-huffman', 1300, 'open', 'GTC', 0, 20),
  (unixepoch(), NULL, 'mock-token-22', -1, 'outcome-team-champion-alex-huffman', 1700, 'open', 'GTC', 1, 10),
  (unixepoch(), NULL, 'mock-token-23', -1, 'outcome-team-champion-alex-huffman', 1800, 'open', 'GTC', 1, 15),
  (unixepoch(), NULL, 'mock-token-24', -1, 'outcome-team-champion-alex-huffman', 1900, 'open', 'GTC', 1, 20);

-- Jon & Tim - Ask 15% ($15), Bid 13% ($13) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-25', -1, 'outcome-team-champion-jon-tim', 1300, 'open', 'GTC', 0, 7),
  (unixepoch(), NULL, 'mock-token-26', -1, 'outcome-team-champion-jon-tim', 1200, 'open', 'GTC', 0, 11),
  (unixepoch(), NULL, 'mock-token-27', -1, 'outcome-team-champion-jon-tim', 1100, 'open', 'GTC', 0, 14),
  (unixepoch(), NULL, 'mock-token-28', -1, 'outcome-team-champion-jon-tim', 1500, 'open', 'GTC', 1, 9),
  (unixepoch(), NULL, 'mock-token-29', -1, 'outcome-team-champion-jon-tim', 1600, 'open', 'GTC', 1, 13),
  (unixepoch(), NULL, 'mock-token-30', -1, 'outcome-team-champion-jon-tim', 1700, 'open', 'GTC', 1, 17);

-- Doc & Will - Ask 13% ($13), Bid 11% ($11) - 2 dollar gap
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-31', -1, 'outcome-team-champion-doc-will', 1100, 'open', 'GTC', 0, 6),
  (unixepoch(), NULL, 'mock-token-32', -1, 'outcome-team-champion-doc-will', 1000, 'open', 'GTC', 0, 9),
  (unixepoch(), NULL, 'mock-token-33', -1, 'outcome-team-champion-doc-will', 900, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-34', -1, 'outcome-team-champion-doc-will', 1300, 'open', 'GTC', 1, 7),
  (unixepoch(), NULL, 'mock-token-35', -1, 'outcome-team-champion-doc-will', 1400, 'open', 'GTC', 1, 11),
  (unixepoch(), NULL, 'mock-token-36', -1, 'outcome-team-champion-doc-will', 1500, 'open', 'GTC', 1, 15);

-- Total asks: 20% + 18% + 17% + 17% + 15% + 13% = 100%
