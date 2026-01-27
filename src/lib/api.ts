const API_BASE = '/api';

// Check if we're in styling-only mode (explicitly enabled)
// This mode allows frontend development without database/backend
const isStylingModeEnabled = typeof window !== 'undefined' && 
  (window.location.search.includes('style=true') || 
   localStorage.getItem('dev-mode') === 'styling');

// Track if API is available (for auto-fallback)
let apiAvailable: boolean | null = null;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // If styling mode is explicitly enabled, use mock data
  if (isStylingModeEnabled) {
    return mockApiRequest<T>(endpoint, options);
  }

  // If we know API is unavailable, use mock data
  if (apiAvailable === false) {
    return mockApiRequest<T>(endpoint, options);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    // Mark API as available if we get any response (even errors)
    apiAvailable = true;

    if (!response.ok) {
      // Only use mock data for server errors, not auth errors
      if (response.status === 0 || (response.status >= 500 && response.status < 600)) {
        apiAvailable = false;
        return mockApiRequest<T>(endpoint, options);
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // Network error or API unavailable - use mock data
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError') {
      apiAvailable = false;
      return mockApiRequest<T>(endpoint, options);
    }
    throw error;
  }
}

// Mock API responses for styling-only mode
async function mockApiRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const { mockApi } = await import('./api-mock');

  // Mock /auth/me
  if (endpoint === '/auth/me') {
    return { user: { id: 1, username: 'dev-user' } } as T;
  }

  // Mock /markets
  if (endpoint === '/markets') {
    return { markets: mockApi.markets } as T;
  }

  // Mock /markets/:id
  if (endpoint.startsWith('/markets/') && options.method !== 'POST') {
    const marketId = endpoint.split('/markets/')[1].split('?')[0]; // Remove query params
    const market = mockApi.markets.find(m => m.market_id === marketId) || mockApi.markets[0];
    const outcomes = marketId === 'market-team-champion' 
      ? mockApi.teamChampionOutcomes 
      : mockApi.teamChampionOutcomes.slice(0, 2);
    
    const orderbook: Record<string, { bids: any[]; asks: any[] }> = {};
    outcomes.forEach(outcome => {
      // Pass outcome_id to generate consistent orderbook for each outcome
      orderbook[outcome.outcome_id] = mockApi.generateOrderbook(outcome.outcome_id);
    });

    return {
      market,
      outcomes,
      orderbook,
      recentTrades: [],
    } as T;
  }

  // Mock /orders, /trades, /positions
  if (endpoint === '/orders' || endpoint.startsWith('/orders')) {
    return { orders: [] } as T;
  }
  if (endpoint === '/trades' || endpoint.startsWith('/trades')) {
    return { trades: [] } as T;
  }
  if (endpoint === '/positions' || endpoint.startsWith('/positions')) {
    return { positions: [] } as T;
  }

  // Mock /scoring/rounds
  if (endpoint.startsWith('/scoring/rounds')) {
    return { rounds: [], roundScores: [] } as T;
  }

  // Mock /participants
  if (endpoint === '/participants') {
    return { participants: [] } as T;
  }

  // Default: return empty object
  return {} as T;
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
};
