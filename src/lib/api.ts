import type { User, Participant, Market, Outcome, Order, Trade, Position } from '../types';

const API_BASE = '/api';

/** GETs to these paths respect server Cache-Control (markets/outcomes/participants cached 12h or 2m). */
function isCacheableGet(endpoint: string, method?: string): boolean {
  if (method && method !== 'GET') return false;
  if (endpoint === '/markets' || endpoint === '/participants') return true;
  // Market detail: /markets/:id (not /markets/:id/orders, etc.)
  if (/^\/markets\/[^/]+$/.test(endpoint)) return true;
  // Handicaps (1-day cache)
  if (endpoint === '/scoring/handicaps' || endpoint.startsWith('/scoring/handicaps?')) return true;
  // Current scores (2m cache)
  if (endpoint === '/scoring/current-scores') return true;
  return false;
}

type ApiRequestOptions = RequestInit & { cacheBust?: boolean };

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  try {
    const { cacheBust, ...fetchOptions } = options;
    const url = `${API_BASE}${endpoint}`;
    const method = options.method ?? 'GET';
    const allowCache = !cacheBust && isCacheableGet(endpoint, method);
    const finalUrl = !allowCache && (method === 'GET' || !method)
      ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : url;

    const response = await fetch(finalUrl, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(allowCache ? {} : { 'Cache-Control': 'no-cache' }),
        ...(fetchOptions.headers ?? {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API Error [${response.status}]: ${endpoint}`, errorText);
      let message = `${response.status} ${response.statusText}`;
      try {
        const errBody = JSON.parse(errorText);
        // API errors are standardized as { error: string }; use it when present.
        if (errBody?.error && typeof errBody.error === 'string') {
          message = errBody.error;
        }
      } catch {
        // use default message
      }
      throw new Error(message);
    }

    return response.json();
  } catch (error: any) {
    console.error(`Network/API Error: ${endpoint}`, error);
    throw error;
  }
}

export const api = {
  // Auth
  register: (data: { username: string; password: string }) =>
    apiRequest<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { username: string; password: string }) =>
    apiRequest<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => apiRequest<{ user: User | null }>('/auth/me'),

  // Participants
  getParticipants: () => apiRequest<{ participants: Participant[] }>('/participants'),

  // Markets
  getMarkets: (options?: { cacheBust?: boolean }) => {
    return apiRequest<{ markets: Market[] }>('/markets', options);
  },

  getMarket: (id: string, options?: { cacheBust?: boolean }) =>
    apiRequest<{ market: Market; outcomes: Outcome[]; orderbook: Record<string, { bids: any[]; asks: any[] }>; trades?: Trade[]; positions?: Position[] }>(`/markets/${id}`, options),

  placeOrder: (marketId: string, data: { outcome_id: string; side: 'bid' | 'ask'; price: number; contract_size: number; tif?: string; token?: string }) =>
    apiRequest<{ order: any; fills: any[]; trades: any[] }>(`/markets/${marketId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrades: (marketId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: Trade[] }>(`/markets/${marketId}/trades${query}`);
  },

  getPositions: (marketId: string) =>
    apiRequest<{ positions: Position[] }>(`/markets/${marketId}/positions`),

  // All trades and positions (across all markets) — only the current user's trades
  getAllTrades: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: Trade[] }>(`/trades${query}`);
  },

  // Global trade tape — all taker trades across the app (not filtered by user)
  getTape: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: Trade[] }>(`/tape${query}`);
  },

  getAllPositions: () =>
    apiRequest<{ positions: Position[] }>('/positions'),

  getPositionsSummary: () =>
    apiRequest<{ count: number }>('/positions?summary=1'),

  getAllOrders: (options?: { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.offset != null && options.offset > 0) params.set('offset', String(options.offset));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ orders: Order[]; hasMore?: boolean }>(`/orders${query}`);
  },

  cancelOrder: (orderId: number) => {
    return apiRequest<{ success: boolean }>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  },

  // Market Suggestions
  suggestMarket: (data: {
    short_name: string;
    symbol: string;
    max_winners: number;
    min_winners: number;
    outcomes: Array<{ name: string; ticker: string; strike?: string; outcome_id?: string }>;
    round_number?: number;
  }) => {
    return apiRequest<{ success: boolean; market_id: string; outcome_ids: string[] }>('/markets/suggest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Handicaps: ?year=2026 (default) for net champion market; year=all for scoring page (cached 1 day)
  getHandicaps: (year?: number | 'all') => {
    const param = year === 'all' ? 'all' : (year ?? 2026);
    const endpoint = `/scoring/handicaps?year=${param}`;
    return year === 'all'
      ? apiRequest<{ handicapsByYear: Record<string, Record<string, number>> }>(endpoint)
      : apiRequest<{ handicaps: Record<string, number> }>(endpoint);
  },

  // Player score volatility: year of highest volatility per player (for Player Score Volatility market). Cached 7 days.
  getPlayerVolatility: () =>
    apiRequest<{ volatilityByPlayer: Record<string, { year: number; volatility: number }> }>('/scoring/volatility'),

  // Current scores: score to par (gross/net) and birdies per participant (for gross/net champion markets)
  getCurrentScores: () =>
    apiRequest<{
      scores: Array<{
        participant_id: string;
        name: string;
        score_gross: number | null;
        score_net: number | null;
        number_birdies: number | null;
      }>;
    }>('/scoring/current-scores'),

  // Scores (historical scoring data)
  getScores: (course?: string, year?: string) => {
    const params = new URLSearchParams();
    if (course) params.append('course', course);
    if (year) params.append('year', year);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<{ scores: Array<{ id: number; course: string; year: number; player: string; score: number | null; index_number: number | null }> }>(`/scoring/scores${query}`);
  },

  updateScoreValue: (data: { course: string; year: number; player: string; score: number | null; index_number?: number | null }) =>
    apiRequest<{ success: boolean }>('/scoring/scores', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin
  adminCancelAllOrders: (userId?: number) =>
    apiRequest<{ canceled: number }>('/admin/orders/cancel-all', {
      method: 'POST',
      body: JSON.stringify(userId != null ? { user_id: userId } : {}),
    }),

  adminGetUsers: () =>
    apiRequest<{ users: Array<{ id: number; username: string }> }>('/admin/users'),

  adminGetLeaderboard: () =>
    apiRequest<{
      leaderboard: Array<{ user_id: number; username: string; trade_count: number; open_orders_count: number; shares_traded: number; portfolio_value_cents: number; closed_profit_cents: number; settled_profit_cents: number }>;
      unattributed_portfolio_value_cents?: number;
      unattributed_closed_profit_cents?: number;
      unattributed_settled_profit_cents?: number;
      system_total_portfolio_value_cents?: number;
      pnl_by_outcome?: Record<string, number>;
      position_contributions?: Array<{ outcome: string; user_id: number | null; contribution_cents: number }>;
      system_total_closed_profit_cents?: number;
      system_total_settled_profit_cents?: number;
      closed_profit_by_outcome?: Record<string, number>;
      settled_profit_by_outcome?: Record<string, number>;
      closed_profit_contributions?: Array<{ outcome: string; user_id: number | null; closed_profit_cents: number }>;
      settled_profit_contributions?: Array<{ outcome: string; user_id: number | null; settled_profit_cents: number }>;
    }>('/admin/leaderboard'),

  adminUpdateMarketPause: (marketId: string, tradingPaused: boolean) =>
    apiRequest<{ market: Market; success: boolean }>(`/admin/markets/${marketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ trading_paused: tradingPaused }),
    }),

  adminCreateManualTrade: (data: {
    taker_user_id: number;
    maker_user_id?: number | null;
    market_id: string;
    outcome_id: string;
    side: 'bid' | 'ask';
    price: number;
    contract_size: number;
  }) =>
    apiRequest<{ trade: { id: number; market_id: string; outcome_id: string; side: string; price: number; contracts: number; taker_user_id?: number; maker_user_id?: number | null } }>('/admin/trades/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminPatchTradeRiskOff: (tradeId: number, data: { risk_off_contracts_taker?: number; risk_off_contracts_maker?: number; risk_off_price_diff_taker?: number; risk_off_price_diff_maker?: number }) =>
    apiRequest<{ trade: { id: number; outcome: string; risk_off_contracts_taker: number; risk_off_contracts_maker: number; risk_off_price_diff_taker: number; risk_off_price_diff_maker: number; taker_user_id?: number; maker_user_id?: number | null }; success: boolean }>(`/admin/trades/${tradeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  adminDeleteTrade: (tradeId: number) =>
    apiRequest<{ deleted: boolean; id: number }>(`/admin/trades/${tradeId}`, {
      method: 'DELETE',
    }),

  /** Recompute position closed_profit from trade risk_off_price_diff_taker/maker per user/outcome. Run after backfilling risk_off on trades. */
  adminClosedProfitFromRiskOff: () =>
    apiRequest<{
      applied: boolean;
      message: string;
      positions_updated: number;
      outcomes_system_updated: number;
    }>('/admin/closed-profit-from-risk-off', { method: 'POST' }),

  /** One-time fix: make sum(closed_profit) = 0 by inserting/updating system offset row. Call once to fix historical imbalance. */
  adminRebalanceClosedProfit: () =>
    apiRequest<{
      applied: boolean;
      message: string;
      sum_cents?: number;
      previous_sum_cents?: number;
      offset_row_new_cents?: number;
      offset_row_previous_cents?: number;
    }>('/admin/rebalance-closed-profit', { method: 'POST' }),

  /** Replay all trades per outcome to recompute net_position, price_basis, closed_profit with zero-sum logic. Use after fixing manual/auction bug. */
  adminReplayPositions: (options?: { full_reset?: boolean; after_trade_id?: number; max_trades?: number }) =>
    apiRequest<{
      applied: boolean;
      message: string;
      outcomes_processed: number;
      trades_replayed: number;
      trades_skipped?: number;
      outcomes_with_skipped?: string[];
      full_reset_applied?: boolean;
      has_more?: boolean;
      after_trade_id?: number;
    }>('/admin/replay-positions', {
      method: 'POST',
      body: JSON.stringify({
        ...(options?.full_reset && { full_reset: true }),
        ...(options?.after_trade_id != null && { after_trade_id: options.after_trade_id }),
        ...(options?.max_trades != null && { max_trades: options.max_trades }),
      }),
    }),

  adminRunRoundOuAuction: (data: {
    auction_type?: 'round_ou' | 'pars';
    round?: number;
    participant_id: string;
    bids: Array<{ user_id: number; guess: number }>;
  }) =>
    apiRequest<{
      market_id: string;
      outcome_id: string;
      strike: string;
      short_user_ids: number[];
      long_user_ids: number[];
      trades_created: number;
    }>('/admin/auction/round-ou', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

};
