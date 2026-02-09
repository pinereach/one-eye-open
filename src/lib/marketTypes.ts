export const MARKET_TYPE_ORDER = [
  'team_champion',
  'individual_champion',
  'market_total_birdies',
  'market_total_pars',
  'matchups',
  'round_ou',
  'specials',
  'h2h_matchups',
  'round_matchups',
  'special_matchups',
  'total_birdies',
  'hole_in_one',
  'other',
];

export function getMarketTypeLabel(marketType: string | null | undefined): string {
  if (!marketType) return 'Other';
  const labels: Record<string, string> = {
    team_champion: 'Team',
    individual_champion: 'Individual',
    market_total_birdies: 'Birdies',
    market_total_pars: 'Pars',
    matchups: 'Matchups',
    round_ou: 'Round O/U',
    specials: 'Specials',
    total_birdies: 'Birdies',
    h2h_matchups: 'Head-to-Head',
    round_matchups: 'Round Matchups',
    special_matchups: 'Special Matchups',
    hole_in_one: 'Specials',
  };
  return labels[marketType] ?? 'Other';
}
