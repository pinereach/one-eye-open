const API_BASE = '/api';

/** GETs to these paths respect server Cache-Control (markets/outcomes/participants cached 12h or 2m). */
function isCacheableGet(endpoint: string, method?: string): boolean {
  if (method && method !== 'GET') return false;
  if (endpoint === '/markets' || endpoint === '/participants') return true;
  // Market detail: /markets/:id (not /markets/:id/orders, etc.)
  if (/^\/markets\/[^/]+$/.test(endpoint)) return true;
  // Handicaps (1-day cache)
  if (endpoint === '/scoring/handicaps' || endpoint.startsWith('/scoring/handicaps?')) return true;
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
    apiRequest<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { username: string; password: string }) =>
    apiRequest<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => apiRequest<{ user: any | null }>('/auth/me'),

  // Participants
  getParticipants: () => apiRequest<{ participants: any[] }>('/participants'),

  // Markets
  getMarkets: () => {
    return apiRequest<{ markets: any[] }>('/markets');
  },

  getMarket: (id: string, options?: { cacheBust?: boolean }) =>
    apiRequest<{ market: any; outcomes: any[]; orderbook: Record<string, { bids: any[]; asks: any[] }>; trades?: any[]; positions?: any[] }>(`/markets/${id}`, options),

  placeOrder: (marketId: string, data: { outcome_id: string; side: 'bid' | 'ask'; price: number; contract_size: number; tif?: string; token?: string }) =>
    apiRequest<{ order: any; fills: any[]; trades: any[] }>(`/markets/${marketId}/orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrades: (marketId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: any[] }>(`/markets/${marketId}/trades${query}`);
  },

  getPositions: (marketId: string) =>
    apiRequest<{ positions: any[] }>(`/markets/${marketId}/positions`),

  // All trades and positions (across all markets) — only the current user's trades
  getAllTrades: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: any[] }>(`/trades${query}`);
  },

  // Global trade tape — all taker trades across the app (not filtered by user)
  getTape: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: any[] }>(`/tape${query}`);
  },

  getAllPositions: () =>
    apiRequest<{ positions: any[] }>('/positions'),

  getAllOrders: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ orders: any[] }>(`/orders${query}`);
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

  adminUpdateMarketPause: (marketId: string, tradingPaused: boolean) =>
    apiRequest<{ market: any; success: boolean }>(`/admin/markets/${marketId}`, {
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

};
