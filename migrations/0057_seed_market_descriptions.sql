-- Seed description (instance) field for each market: quick sentence on rules and settlement

UPDATE markets SET description = 'Bet on whether the group makes 1 or more eagles vs 2 or more. Settles on total eagles made by all players.' WHERE market_id = 'market-eagles';

UPDATE markets SET description = 'Tournament head-to-head matchups. Settles on net score: the player with the lower net score wins the matchup.' WHERE market_id = 'market-h2h-matchups';

UPDATE markets SET description = 'Bet Yes or No on whether any player makes a hole in one. Settles after the round.' WHERE market_id = 'market-hole-in-one';

UPDATE markets SET description = 'Lowest gross score wins. Settles on final 72-hole gross totals.' WHERE market_id = 'market-individual-gross-champion';

UPDATE markets SET description = 'Lowest net score (with handicaps) wins. Settles on final 72-hole net totals.' WHERE market_id = 'market-individual-net-champion';

UPDATE markets SET description = 'Combined group score for Round 1 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-1-ou';
UPDATE markets SET description = 'Combined group score for Round 2 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-2-ou';
UPDATE markets SET description = 'Combined group score for Round 3 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-3-ou';
UPDATE markets SET description = 'Combined group score for Round 4 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-4-ou';
UPDATE markets SET description = 'Combined group score for Round 5 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-5-ou';
UPDATE markets SET description = 'Combined group score for Round 6 Over or Under the line. Settles on round total vs the strike.' WHERE market_id = 'market-round-6-ou';

UPDATE markets SET description = 'User-created matchups for the round. Settles on net score: lower net wins the matchup.' WHERE market_id = 'market-round-matchups';

UPDATE markets SET description = 'User-created special matchups. Settles per the rules defined for each matchup.' WHERE market_id = 'market-special-matchups';

UPDATE markets SET description = 'Bet on whether a score or total falls inside a specified range. Settles on actual result vs the range.' WHERE market_id = 'market-specials-score-range';

UPDATE markets SET description = 'Bet on whether a player (or group) finishes under par on net score. Settles on net total vs par.' WHERE market_id = 'market-specials-under-par-net';

UPDATE markets SET description = 'Combined two-person team score. The team with the lowest combined total wins.' WHERE market_id = 'market-team-champion';

UPDATE markets SET description = 'Total birdies by the group Over or Under the line. Settles on combined birdie count vs the strike.' WHERE market_id = 'market-total-birdies';
