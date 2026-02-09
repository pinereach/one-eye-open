/**
 * Single source of truth for main app nav links (desktop + mobile menu).
 * Used by App.tsx; path/label can be reused by BottomNav.
 */
export interface NavItem {
  path: string;
  label: string;
  viewScores?: boolean;
  viewMarketCreation?: boolean;
  admin?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { path: '/scoring', label: 'Scoring', viewScores: true },
  { path: '/markets', label: 'Markets' },
  { path: '/tape', label: 'Tape' },
  { path: '/orders', label: 'Orders' },
  { path: '/trades', label: 'Trades' },
  { path: '/positions', label: 'Positions' },
  { path: '/market-suggestions', label: 'Market Suggestions', viewMarketCreation: true },
  { path: '/leaderboard', label: 'Leaderboard', admin: true },
  { path: '/admin', label: 'Admin', admin: true },
];

export function isNavItemVisible(item: NavItem, user: { view_scores?: boolean; view_market_creation?: boolean; admin?: boolean } | null): boolean {
  if (item.viewScores) return !!user?.view_scores;
  if (item.viewMarketCreation) return !!user?.view_market_creation;
  if (item.admin) return !!user?.admin;
  return true;
}

export function isNavPathActive(path: string, pathname: string): boolean {
  if (path === '/markets') return pathname === '/markets' || pathname.startsWith('/markets/');
  return pathname === path;
}
