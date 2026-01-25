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

  me: () => apiRequest<{ user: any }>('/auth/me'),

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

  // Export
  exportTrades: () => {
    return fetch(`${API_BASE}/export?type=trades`, { credentials: 'include' });
  },
};
