export const MARKET_TYPE_ORDER = [
  'team_champion',
  'individual_champion',
  'matchups',
  'h2h_matchups',
  'round_matchups',
  'special_matchups',
  'round_ou',
  'total_birdies',
  'specials',
  'hole_in_one',
  'other',
];

export function getMarketTypeLabel(marketType: string | null | undefined): string {
  if (!marketType) return 'Other';
  const labels: Record<string, string> = {
    team_champion: 'Team',
    individual_champion: 'Individual',
    matchups: 'Matchups',
    h2h_matchups: 'Head-to-Head',
    round_matchups: 'Round Matchups',
    special_matchups: 'Special Matchups',
    round_ou: 'Round Over/Under',
    total_birdies: 'Totals',
    specials: 'Specials',
    hole_in_one: 'Specials',
  };
  return labels[marketType] ?? 'Other';
}
