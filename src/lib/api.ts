const API_BASE = '/api';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; displayName: string }) =>
    apiRequest<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    apiRequest<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => apiRequest<{ user: any }>('/auth/me'),

  // Trips
  getTrips: () => apiRequest<{ trips: any[] }>('/trips'),
  getTrip: (id: string) => apiRequest<{ trip: any; members: any[]; rounds: any[]; markets: any[] }>(`/trips/${id}`),

  // Markets
  getMarkets: (params?: { tripId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.tripId) searchParams.set('tripId', params.tripId);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return apiRequest<{ markets: any[] }>(`/markets${query ? `?${query}` : ''}`);
  },

  getMarket: (id: string) =>
    apiRequest<{ market: any; orderbook: { bids: any[]; asks: any[] }; recentTrades: any[] }>(`/markets/${id}`),

  placeOrder: (marketId: string, data: { side: 'bid' | 'ask'; price_cents: number; qty_contracts: number }) =>
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

  // Scoring
  getRounds: (params?: { tripId?: string; roundId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.tripId) searchParams.set('tripId', params.tripId);
    if (params?.roundId) searchParams.set('roundId', params.roundId);
    const query = searchParams.toString();
    return apiRequest<{ rounds?: any[]; round?: any; scores?: any[] }>(`/scoring/rounds${query ? `?${query}` : ''}`);
  },

  updateScore: (roundId: string, data: { cross_score: number | null; net_score: number | null }) =>
    apiRequest<{ score: any }>(`/scoring/rounds?roundId=${roundId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Ledger
  getLedger: (tripId?: string) => {
    const query = tripId ? `?tripId=${tripId}` : '';
    return apiRequest<{ entries: any[] }>(`/ledger${query}`);
  },

  // Export
  exportScores: (tripId?: string) => {
    const query = tripId ? `?type=scores&tripId=${tripId}` : '?type=scores';
    return fetch(`${API_BASE}/export${query}`, { credentials: 'include' });
  },

  exportTrades: (tripId?: string) => {
    const query = tripId ? `?type=trades&tripId=${tripId}` : '?type=trades';
    return fetch(`${API_BASE}/export${query}`, { credentials: 'include' });
  },

  exportLedger: (tripId?: string) => {
    const query = tripId ? `?type=ledger&tripId=${tripId}` : '?type=ledger';
    return fetch(`${API_BASE}/export${query}`, { credentials: 'include' });
  },
};
