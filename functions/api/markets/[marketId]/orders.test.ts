import { describe, it, expect } from 'vitest';
import { onRequestPost } from './orders';

describe('POST /api/markets/:id/orders', () => {
  it('returns 401 when no session cookie', async () => {
    const request = new Request('http://localhost/api/markets/m1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome_id: 'out-1',
        side: 'bid',
        price: 5000,
        contract_size: 1,
      }),
    });
    const env = { DB: null } as any;
    const context = { request, env, params: { marketId: 'm1' } };
    const response = await onRequestPost(context as any);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: expect.any(String) });
    expect(body.error.toLowerCase()).toMatch(/unauthorized|invalid session/);
  });
});
