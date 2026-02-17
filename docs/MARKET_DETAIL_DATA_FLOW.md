# Market detail: how data is loaded and when it updates

## Where the data comes from

- **Single source**: `GET /api/markets/:id` returns market, outcomes, orderbook (bids/asks per outcome), trades, positions, and last-trade prices.
- **MarketDetail** loads this via `loadMarket(forceRefresh)`, which calls `api.getMarket(id, forceRefresh ? { cacheBust: true } : undefined)` and then sets React state (market, outcomes, orderbookByOutcome, trades, positions, lastTradePriceByOutcomeFromApi).

## Caching (why you sometimes see stale prices)

**It’s HTTP caching, not cookies.**

1. **Server** ([functions/api/markets/[marketId]/index.ts](functions/api/markets/[marketId]/index.ts)) sets:
   - `Cache-Control: public, max-age=120, stale-while-revalidate=60`
   - So the response can be cached for **2 minutes** and still served stale for another **60 seconds** while revalidating.

2. **Client** ([src/lib/api.ts](src/lib/api.ts)):
   - For `GET /markets` and `GET /markets/:id`, requests are treated as **cacheable** unless you pass `cacheBust: true`.
   - When cacheable: the request uses the plain URL (no `_t=...`) and does **not** send `Cache-Control: no-cache`, so the **browser (and any CDN) can reuse a cached response**.

3. **When you navigate away and back** to the same market (before the fix below):
   - The component ran `useEffect(() => { if (id) loadMarket(); }, [id])`.
   - That called `loadMarket()` with **no** `forceRefresh` → `cacheBust` was **false** → request was cacheable.
   - If the previous response was still within the 2‑minute (or stale-while-revalidate) window, the browser could return that **cached response**, so you saw **old orderbook/prices**.

So the “stale prices” come from this **HTTP cache** (and possibly CDN), not from cookies.

## When the UI does get fresh data

- **After you place an order**: The place-order flow always calls `loadMarket(true)`, so the next request uses `cacheBust: true` and gets a fresh response. So “everything updates every time an order is made” is correct for your own orders.
- **Pull-to-refresh**: The market page uses `<PullToRefresh onRefresh={loadMarket}>` but that calls `loadMarket()` with no argument, so it’s still a **cacheable** request and can still be stale.
- **Opening the order sheet / returning to tab**: There are effects that call `loadMarket()` (no `forceRefresh`) only if at least `MIN_REFRESH_INTERVAL_MS` (2 minutes) has passed since the last load. Again, that request is cacheable, so it can still be stale.

## Summary (after fix)

| Action                         | Calls              | Cache bust? | Can show stale?        |
|--------------------------------|--------------------|------------|-------------------------|
| Navigate to market (or back)   | `loadMarket(true)` | Yes        | No                      |
| Place order (success or error) | `loadMarket(true)` | Yes        | No                      |
| Pull-to-refresh                | `loadMarket(true)` | Yes        | No                      |
| Open order sheet / tab visible | `loadMarket()`     | No         | Yes (throttled 2 min)   |

Opening a market (including navigating back) and pull-to-refresh now use `loadMarket(true)`, so they bypass HTTP cache and get fresh orderbook/prices. All other loads (including “navigate back to market”) can use the browser’s cached response and show stale prices until the cache expires or you place another order.
