const API_BASE = '/api';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Add cache-busting for GET requests to prevent stale cached responses
    const url = `${API_BASE}${endpoint}`;
    const cacheBustUrl = options.method === 'GET' || !options.method
      ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : url;
    
    const response = await fetch(cacheBustUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API Error [${response.status}]: ${endpoint}`, errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
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

  getMarket: (id: string) =>
    apiRequest<{ market: any; outcomes: any[]; orderbook: Record<string, { bids: any[]; asks: any[] }>; recentTrades: any[] }>(`/markets/${id}`),

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

  // All trades and positions (across all markets)
  getAllTrades: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest<{ trades: any[] }>(`/trades${query}`);
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

  // Scoring
  getScoringRounds: (roundId?: string) => {
    const query = roundId ? `?roundId=${roundId}` : '';
    return apiRequest<{ rounds: any[]; roundScores: any[] }>(`/scoring/rounds${query}`);
  },

  // Market Suggestions
  suggestMarket: (data: {
    short_name: string;
    symbol: string;
    max_winners: number;
    min_winners: number;
    outcomes: Array<{ name: string; ticker: string; strike?: string }>;
    round_number?: number;
  }) => {
    return apiRequest<{ success: boolean; market_id: string; outcome_ids: string[] }>('/markets/suggest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateScore: (roundId: string, data: { cross_score?: number; net_score?: number }) =>
    apiRequest<{ success: boolean }>(`/scoring/rounds?roundId=${roundId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
};
