-- Fix positions that were given the wrong sign due to maker-side bug (bid filled was recorded as ask).
-- Only corrects the two known affected rows: user 1 on outcome-h2h-ALEX-LOOP, user 2 on outcome-h2h-ALEX-KRASS.
-- Safe to run multiple times: only updates where net_position = -1 (flip to +1).

UPDATE positions SET net_position = 1
WHERE (user_id = 1 AND outcome = 'outcome-h2h-ALEX-LOOP' AND net_position = -1)
   OR (user_id = 2 AND outcome = 'outcome-h2h-ALEX-KRASS' AND net_position = -1);
