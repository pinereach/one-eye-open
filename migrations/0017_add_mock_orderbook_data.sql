-- Add mock orderbook data for Team Champion outcomes
-- Each outcome will have multiple bid and ask orders
-- Sum of best bid + best ask should be around 105 (simulating spread/fees)

-- Get the first user ID (assuming there's at least one user)
-- We'll use NULL for user_id to make these system/mock orders

-- Loop & Boose - Best bid $50, best ask $52 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  -- Bids (buying Yes) - whole dollars only
  (unixepoch(), NULL, 'mock-token-1', -1, 'outcome-team-champion-loop-boose', 5000, 'open', 'GTC', 0, 10),
  (unixepoch(), NULL, 'mock-token-2', -1, 'outcome-team-champion-loop-boose', 4900, 'open', 'GTC', 0, 15),
  (unixepoch(), NULL, 'mock-token-3', -1, 'outcome-team-champion-loop-boose', 4800, 'open', 'GTC', 0, 20),
  (unixepoch(), NULL, 'mock-token-4', -1, 'outcome-team-champion-loop-boose', 4700, 'open', 'GTC', 0, 25),
  -- Asks (selling Yes / buying No) - whole dollars only, 2 dollar gap from best bid
  (unixepoch(), NULL, 'mock-token-5', -1, 'outcome-team-champion-loop-boose', 5200, 'open', 'GTC', 1, 12),
  (unixepoch(), NULL, 'mock-token-6', -1, 'outcome-team-champion-loop-boose', 5300, 'open', 'GTC', 1, 18),
  (unixepoch(), NULL, 'mock-token-7', -1, 'outcome-team-champion-loop-boose', 5400, 'open', 'GTC', 1, 22),
  (unixepoch(), NULL, 'mock-token-8', -1, 'outcome-team-champion-loop-boose', 5500, 'open', 'GTC', 1, 30);

-- Krass & TK - Best bid $35, best ask $37 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-9', -1, 'outcome-team-champion-krass-tk', 3500, 'open', 'GTC', 0, 8),
  (unixepoch(), NULL, 'mock-token-10', -1, 'outcome-team-champion-krass-tk', 3400, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-11', -1, 'outcome-team-champion-krass-tk', 3300, 'open', 'GTC', 0, 15),
  (unixepoch(), NULL, 'mock-token-12', -1, 'outcome-team-champion-krass-tk', 3700, 'open', 'GTC', 1, 10),
  (unixepoch(), NULL, 'mock-token-13', -1, 'outcome-team-champion-krass-tk', 3800, 'open', 'GTC', 1, 14),
  (unixepoch(), NULL, 'mock-token-14', -1, 'outcome-team-champion-krass-tk', 3900, 'open', 'GTC', 1, 18);

-- CTH & Avayou - Best bid $25, best ask $27 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-15', -1, 'outcome-team-champion-cth-avayou', 2500, 'open', 'GTC', 0, 5),
  (unixepoch(), NULL, 'mock-token-16', -1, 'outcome-team-champion-cth-avayou', 2400, 'open', 'GTC', 0, 8),
  (unixepoch(), NULL, 'mock-token-17', -1, 'outcome-team-champion-cth-avayou', 2300, 'open', 'GTC', 0, 10),
  (unixepoch(), NULL, 'mock-token-18', -1, 'outcome-team-champion-cth-avayou', 2700, 'open', 'GTC', 1, 6),
  (unixepoch(), NULL, 'mock-token-19', -1, 'outcome-team-champion-cth-avayou', 2800, 'open', 'GTC', 1, 9),
  (unixepoch(), NULL, 'mock-token-20', -1, 'outcome-team-champion-cth-avayou', 2900, 'open', 'GTC', 1, 12);

-- Alex & Huffman - Best bid $60, best ask $62 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-21', -1, 'outcome-team-champion-alex-huffman', 6000, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-22', -1, 'outcome-team-champion-alex-huffman', 5900, 'open', 'GTC', 0, 16),
  (unixepoch(), NULL, 'mock-token-23', -1, 'outcome-team-champion-alex-huffman', 5800, 'open', 'GTC', 0, 20),
  (unixepoch(), NULL, 'mock-token-24', -1, 'outcome-team-champion-alex-huffman', 6200, 'open', 'GTC', 1, 10),
  (unixepoch(), NULL, 'mock-token-25', -1, 'outcome-team-champion-alex-huffman', 6300, 'open', 'GTC', 1, 15),
  (unixepoch(), NULL, 'mock-token-26', -1, 'outcome-team-champion-alex-huffman', 6400, 'open', 'GTC', 1, 20);

-- Jon & Tim - Best bid $40, best ask $42 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-27', -1, 'outcome-team-champion-jon-tim', 4000, 'open', 'GTC', 0, 7),
  (unixepoch(), NULL, 'mock-token-28', -1, 'outcome-team-champion-jon-tim', 3900, 'open', 'GTC', 0, 11),
  (unixepoch(), NULL, 'mock-token-29', -1, 'outcome-team-champion-jon-tim', 3800, 'open', 'GTC', 0, 14),
  (unixepoch(), NULL, 'mock-token-30', -1, 'outcome-team-champion-jon-tim', 4200, 'open', 'GTC', 1, 9),
  (unixepoch(), NULL, 'mock-token-31', -1, 'outcome-team-champion-jon-tim', 4300, 'open', 'GTC', 1, 13),
  (unixepoch(), NULL, 'mock-token-32', -1, 'outcome-team-champion-jon-tim', 4400, 'open', 'GTC', 1, 17);

-- Doc & Will - Best bid $30, best ask $32 (2 dollar gap)
INSERT INTO orders (create_time, user_id, token, order_id, outcome, price, status, tif, side, contract_size) VALUES
  (unixepoch(), NULL, 'mock-token-33', -1, 'outcome-team-champion-doc-will', 3000, 'open', 'GTC', 0, 6),
  (unixepoch(), NULL, 'mock-token-34', -1, 'outcome-team-champion-doc-will', 2900, 'open', 'GTC', 0, 9),
  (unixepoch(), NULL, 'mock-token-35', -1, 'outcome-team-champion-doc-will', 2800, 'open', 'GTC', 0, 12),
  (unixepoch(), NULL, 'mock-token-36', -1, 'outcome-team-champion-doc-will', 3200, 'open', 'GTC', 1, 7),
  (unixepoch(), NULL, 'mock-token-37', -1, 'outcome-team-champion-doc-will', 3300, 'open', 'GTC', 1, 11),
  (unixepoch(), NULL, 'mock-token-38', -1, 'outcome-team-champion-doc-will', 3400, 'open', 'GTC', 1, 15);
