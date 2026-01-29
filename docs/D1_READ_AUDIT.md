# D1 Read Usage Audit

This document identifies the API routes and frontend behavior that are likely driving high D1 row reads (e.g. 639k rows for 2 users over ~2 hours). Each request’s **approximate row read impact** is noted so you can target the biggest wins first.

---

## 1. No explicit polling

There is **no `setInterval`** for tape, orderbook, or markets. High reads are from:

- **Request count**: Many page loads and refetches.
- **Rows per request**: Some endpoints scan large tables or run heavy queries on every call.

---

## 2. Highest-impact API routes (by rows read)

### 2.1 GET /api/tape — **Very high (every call)**

**When it runs:** Once when user opens the Tape page (no polling).

**Why it’s expensive:**

1. **UPDATE on every request** ([functions/api/tape/index.ts](functions/api/tape/index.ts) lines 21–36):
   - For **each** trade with `outcome IS NULL`, the DB runs a correlated subquery that scans **orders** (time/price match).
   - If there are hundreds of NULL-outcome trades, that’s hundreds of order scans per tape load.
   - This runs on **every** GET /api/tape, even when no backfill is needed.

2. **Main SELECT**: Trades JOIN outcomes JOIN markets LEFT JOIN users (×2). With `LIMIT 40`, the join can still touch many rows before applying limit, and the UPDATE above has already run.

**Rough rows per request:** UPDATE: O(trades with NULL outcome) × (orders scan) + main query (trades + outcomes + markets + users). Can easily be **thousands** per tape load.

**Recommendation:**

- **Remove or gate the backfill UPDATE** from the tape GET handler. Run it from a scheduled job or a separate admin endpoint, or only when `?backfill=1` and an admin token is present. Do not run it on every tape load.

---

### 2.2 GET /api/markets/[id] — **High (market detail)**

**When it runs:**

- Once when user opens a market (good: single combined request for market + orderbook + trades + positions).
- Again when:
  - User opens the order bottom sheet and data is older than 45s (`MIN_REFRESH_INTERVAL_MS`).
  - User returns to the browser tab and data is older than 45s (`visibilitychange`).
  - User pulls to refresh or clicks “Refresh”.
  - **Before placing an order** (“pre-submit” check in [MarketDetail.tsx](src/components/markets/MarketDetail.tsx) ~line 241: `api.getMarket(id)`), so **every submit can double the market-detail reads**.

**Queries (rows read):**

| Step | Query | Rows (typical) |
|------|------|------------------|
| Auth (optional) | users | 1 |
| Market | markets | 1 |
| Outcomes | outcomes | N (e.g. 5–20) |
| Orderbook bids | orders WHERE outcome IN (...) AND side=0 | **All open bids for that market** (can be hundreds) |
| Orderbook asks | orders WHERE outcome IN (...) AND side=1 | **All open asks for that market** (can be hundreds) |
| Trades | trades JOIN outcomes, LIMIT 20 | 20 + outcome rows |
| Positions | positions JOIN outcomes JOIN markets | P (user positions in market) |
| Best bid/ask for positions | orders (bids) | rows for position outcomes |
| Best bid/ask for positions | orders (asks) | rows for position outcomes |

**Rough rows per request:** 1 + 1 + N + (all bids in market) + (all asks in market) + 20 + P + 2×(order rows for position outcomes). With 500 open orders per side, that’s **1,000+ order rows per market open**, plus the rest.

**Recommendations:**

- **Pre-submit refetch:** Only refetch orderbook (or skip refetch) when placing an order; avoid a full `getMarket()` right before every submit. Or refetch only if the order form has been open for more than X seconds.
- **Throttle refetch on visibility:** Increase the 45s throttle (e.g. 2–3 minutes) so switching tabs doesn’t refetch as often.
- **Limit orderbook depth in the query:** e.g. per outcome keep only best 5–10 bids/asks (window/subquery) so you don’t read every open order.

---

### 2.3 GET /api/markets — **Medium–high (list)**

**When it runs:** When user opens Markets page, pull-to-refresh, or navigates with `key={location.key}` (remount can refetch).

**Queries:**

| Step | Query | Rows |
|------|--------|------|
| Markets | SELECT * FROM markets | M |
| Outcomes | SELECT * FROM outcomes WHERE market_id IN (...) | O (all outcomes across markets) |
| Volume | SELECT o.market_id, SUM(t.contracts) FROM trades t JOIN outcomes o ... GROUP BY o.market_id | **All trades** (full scan of trades + outcomes) |

**Rough rows per request:** M + O + (trades + outcomes). If you have thousands of trades, the volume query alone is **thousands of rows** per list load.

**Recommendations:**

- **Limit volume aggregation:** e.g. only consider trades in the last 30 days, or run volume as a periodic job and store per-market volume in a table/cache instead of aggregating all trades on every list load.
- **Cache response:** Short cache (e.g. 60s) for GET /api/markets to avoid repeated full scans when users revisit the list.

---

### 2.4 GET /api/positions — **High when price_basis is wrong**

**When it runs:** When user opens Positions page (and pull-to-refresh).

**Queries:**

| Step | Query | Rows |
|------|--------|------|
| Auth | users | 1 |
| Positions | positions JOIN outcomes JOIN markets | P |
| **Per position with bad price_basis** | recalculatePriceBasisFromTrades → SELECT FROM trades WHERE outcome=? AND (taker_user_id=? OR maker_user_id=?) | **All trades for that user/outcome** |
| **Per position with bad price_basis** | recalculatePriceBasis → SELECT FROM orders WHERE ... | Orders for that user/outcome |
| **Per position with bad price_basis** | UPDATE positions | 1 write |
| Best bid/ask | orders (bids for all position outcomes) | many |
| Best bid/ask | orders (asks for all position outcomes) | many |

**Rough rows per request:** 1 + P + (for each position needing recalc: full trades scan + orders scan) + 2×(order rows). If 10 positions need recalc and each has 50 trades, that’s **500+ trade rows** plus orders, per positions load.

**Recommendations:**

- Run price_basis backfill in a one-off or scheduled job so normal GET /api/positions rarely hits recalc.
- Or recalc at most once per position per day (e.g. store `last_recalc_at` and skip if recent).

---

### 2.5 GET /api/orders — **Medium**

**When it runs:** When user opens Orders page (and pull-to-refresh).

**Queries:**

| Step | Query | Rows |
|------|--------|------|
| Auth | users | 1 |
| Orders | orders JOIN outcomes JOIN markets, LIMIT 100 | O (up to 100) |
| Trade fallback | SELECT ... FROM trades WHERE (outcome=? AND price=?) OR (outcome=? AND price=?) OR ... | **Can scan most or all of trades** if many (outcome, price) pairs |

The trades query has **no LIMIT** and can touch every row in `trades` when there are many filled/partial orders without `original_contract_size`.

**Recommendations:**

- Ensure new orders get `original_contract_size` (or equivalent) set so trade fallback is rarely needed.
- If you keep the fallback, add a LIMIT or aggregate in a way that doesn’t scan the whole trades table (e.g. one query per outcome with LIMIT, or a pre-aggregated table).

---

### 2.6 Auth (every authenticated request)

**When it runs:** On every request that uses `requireAuth()` or `getUserFromToken()`.

**Rows:** 1 (users lookup by id).

**Impact:** Request count × 1. With hundreds of requests in 2 hours, auth alone is hundreds of reads. Not the main driver but adds up.

**Recommendation:** Consider short-lived in-worker or edge cache for “user by id” (e.g. 10–30s TTL) so repeated requests from the same session don’t hit D1 every time. Optional and lower priority than the above.

---

## 3. Frontend behavior that increases request count

| Trigger | Effect |
|--------|--------|
| **Navigate to market** | 1× GET /api/markets/[id] (good: single combined call). |
| **Open order sheet after 45s** | 1× GET /api/markets/[id]. |
| **Switch back to tab after 45s** | 1× GET /api/markets/[id]. |
| **Click “Place order”** | Pre-submit `getMarket(id)` + POST order. So **2× market detail reads per submit** when pre-submit runs. |
| **Pull to refresh (market)** | 1× GET /api/markets/[id]. |
| **Navigate to Markets list** | 1× GET /api/markets (with full volume aggregation). |
| **Navigate to Tape** | 1× GET /api/tape (and the heavy UPDATE). |
| **Navigate to Orders** | 1× GET /api/orders. |
| **Navigate to Positions** | 1× GET /api/positions (and recalc for bad price_basis). |

No polling, but **frequent navigation + refetch-on-visibility + pre-submit refetch** can make market detail and tape very read-heavy.

---

## 4. Suggested implementation order

| Priority | Action | Expected impact |
|----------|--------|------------------|
| 1 | **Tape: remove or gate the backfill UPDATE** from GET /api/tape (run via job or admin-only). | Large reduction in rows per tape load (often thousands → tens). |
| 2 | **Market detail: stop or relax pre-submit full refetch** (skip or do a lighter orderbook check). | Cuts duplicate market-detail reads on every place order. |
| 3 | **Markets list: limit volume query** (time window or cached volume table). | Reduces GET /api/markets from scanning all trades every time. |
| 4 | **Market detail: increase refetch throttle** (e.g. 45s → 2–3 min) for visibility and order-sheet open. | Fewer refetches per session. |
| 5 | **Positions: avoid recalc on every request** (backfill job or recalc at most once per position per day). | Large reduction when many positions have bad price_basis. |
| 6 | **Orders: ensure original_contract_size is set and/or limit trade fallback query.** | Prevents full trades scan on GET /api/orders. |
| 7 | (Optional) **Cache GET /api/markets** (e.g. 60s). | Fewer full list + volume scans on repeat visits. |

---

## 5. Quick reference

- **Tape:** One UPDATE per request + main query → fix UPDATE first.
- **Market detail:** Many refetch triggers + pre-submit refetch + full orderbook each time → reduce refetches and/or limit orderbook depth.
- **Markets list:** Full trades scan for volume on every load → limit or cache volume.
- **Positions:** Per-position recalc over full trades/orders → move recalc off the hot path.
- **Orders:** Unbounded trades query for fallback → set original_contract_size and/or limit query.

Focusing on **tape UPDATE**, **market-detail refetch behavior**, and **markets volume query** should give the largest drop in D1 reads for the same user behavior.
