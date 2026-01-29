# Plan: Reduce Database Calls (D1 Free Tier)

This document outlines where DB reads/writes happen and concrete steps to reduce them so usage stays within Cloudflare D1 free limits.

---

## 1. Current Hotspots (where calls add up)

### 1.1 Market detail page (opening one market)

**Frontend:** 3 separate API calls on mount:

- `GET /api/markets/[id]` → loadMarket()
- `GET /api/markets/[id]/trades` → loadTrades()
- `GET /api/markets/[id]/positions` → loadPositions()

**Backend DB reads per request:**

| Request | DB reads | Notes |
|--------|----------|--------|
| GET /markets/[id] | 1 (market) + 1 (outcomes) + **2×N** (bids + asks per outcome) + 1 (trades) | N = number of outcomes. 10 outcomes ⇒ **23 reads**. |
| GET /markets/[id]/trades | 1 (+ 1 auth for optional user) | Trades filtered by market. |
| GET /markets/[id]/positions | 1 (positions) + **2×P** (best bid + best ask per position) | P = positions in that market. |
| **Auth (requireAuth)** | **1 read per request** | Session lookup on every authenticated call. |

**Total for one market open:** e.g. 23 + 2 + (1 + 2×3) = **32 reads** (10 outcomes, 3 positions), plus 3 auth lookups.

### 1.2 Markets list page

- **GET /api/markets:** 1 (all markets) + **1 per market** (outcomes per market) ⇒ **1 + M** reads (M = number of markets).

### 1.3 Orders list (GET /api/orders)

- 1 read (orders with JOINs to outcomes/markets).
- For **each** filled/partial order without `original_contract_size`: 1–2 extra reads (trades) to compute display size ⇒ up to **1 + 2×O** reads (O = order count in response).

### 1.4 All positions (GET /api/positions)

- 1 read (positions with JOINs).
- For each position with `price_basis = 0`: 1+ read (recalc) and 1 write (UPDATE).
- **2×P** reads (best bid + best ask per position) ⇒ **1 + 2×P** minimum, more if recalc runs.

### 1.5 Place order (POST /markets/[id]/orders)

- Auth + market + outcome + exposure + INSERT order + SELECT order + matching (getOppositeOrders, then per fill: updateOrderStatus, get maker, createTrade, get/update position, get trade) + validation ⇒ **tens of reads/writes** per order.

---

## 2. Reduction strategies (in priority order)

### 2.1 Fewer HTTP requests ⇒ fewer auth + handler runs

**Goal:** One request for “market detail page” instead of three.

**Options:**

- **A. Enrich GET /api/markets/[id] and use it only**  
  - Backend: In `functions/api/markets/[marketId]/index.ts`, add market-scoped trades (filter by `outcomes.market_id`) and market-scoped positions (same market, current user). Return `{ market, outcomes, orderbook, trades, positions }`.  
  - Frontend: In `MarketDetail.tsx`, call only `api.getMarket(id)` on mount. Set `trades` and `positions` from `data.trades` and `data.positions`. Remove separate `loadTrades()` and `loadPositions()` on mount.  
  - **Saves:** 2 HTTP requests, 2 auth lookups, and 2 round-trips per market open.

- **B. New combined endpoint**  
  - e.g. `GET /api/markets/[id]/page` that returns the same payload. Frontend calls this once. Same saving as A.

**Recommendation:** Do **A** (extend existing GET market) so one “open market” = one request and one auth.

---

### 2.2 Remove N+1 in GET /api/markets/[id] (orderbook)

**Current:** For each outcome, 2 queries (bids, asks) ⇒ **2×N** queries.

**Change:** One query for all open/partial orders whose outcome belongs to this market, then group in JS.

- Query:  
  `SELECT * FROM orders WHERE status IN ('open','partial') AND outcome IN (SELECT outcome_id FROM outcomes WHERE market_id = ?) ORDER BY outcome, side, price DESC, create_time` (and one variant or `CASE` for ask order).  
  Or two queries total: all bids for market outcomes, all asks for market outcomes; group by `outcome`.
- **Saves:** From 2×N to **2** (or 1) reads for orderbook, regardless of N.

**File:** `functions/api/markets/[marketId]/index.ts`.

---

### 2.3 Remove N+1 in GET /api/markets (list)

**Current:** 1 query for markets, then 1 query per market for outcomes ⇒ **1 + M**.

**Change:** One query for markets, one query for all outcomes with `market_id IN (list of market ids)`, then group outcomes by `market_id` in JS.

- **Saves:** From 1 + M to **2** reads total.

**File:** `functions/api/markets/index.ts`.

---

### 2.4 Fewer reads in GET /api/orders

**Current:** For filled/partial orders without `original_contract_size`, each can trigger 1–2 trades queries.

**Changes:**

- Prefer `original_contract_size` everywhere; only hit trades when it’s null/zero and status is filled/partial.
- **Batch trades:** For all such orders in the response, collect `(outcome, price)` and run **one** query like  
  `SELECT outcome, price, SUM(contracts) as total_contracts FROM trades WHERE (outcome, price) IN (...) GROUP BY outcome, price`  
  (or one query per outcome/price if DB doesn’t support that), then map results back to orders.  
  Avoid one query per order.

**File:** `functions/api/orders/index.ts`.

---

### 2.5 Fewer reads in GET /api/positions and GET /api/markets/[id]/positions

**Current:** For each position, 2 queries (best bid, best ask) ⇒ **2×P**.

**Change:** One query per “type” across all relevant outcomes:

- Outcomes in scope: from positions (e.g. list of `position.outcome`) or from market (e.g. outcomes for that market).
- Query 1: best bid per outcome (e.g. window function or subquery: “per outcome, side=0, status in ('open','partial'), ORDER BY price DESC, LIMIT 1”).
- Query 2: best ask per outcome (same idea, side=1, ORDER BY price ASC).

Then in JS, map outcome → (bestBid, bestAsk) and attach to each position.

**Saves:** From 2×P to **2** reads for “current price” regardless of P.

**Files:** `functions/api/positions/index.ts`, `functions/api/markets/[marketId]/positions.ts`.

---

### 2.6 Cache read-heavy, rarely changing data *(implemented)*

**Implemented:**

- **GET /api/markets** (list): `Cache-Control: public, max-age=43200` (12h). Markets + outcomes + 30-day volume; reference data changes rarely.
- **GET /api/markets/[id]/reference**: New endpoint returning only `{ market, outcomes }` with `Cache-Control: public, max-age=43200` (12h). Use when only reference data is needed (e.g. headers); full detail remains on GET /api/markets/[id].
- **GET /api/markets/[id]** (full detail): `Cache-Control: public, max-age=120` (2 min). Orderbook/trades/positions change often; short cache cuts repeat reads without stale data.
- **GET /api/participants**: `Cache-Control: public, max-age=43200` (12h). Reference data.

Frontend: GETs to `/markets`, `/participants`, and `/markets/:id` (no subpath) no longer add cache-busting `_t`, so browser/CDN can use the above Cache-Control values.

---

### 2.7 Lazy-load trades and positions (optional)

If you don’t merge trades/positions into the main market request:

- On market open, call only GET market (with orderbook). Load trades when user opens “Trades” tab; load positions when user opens “Positions” tab (or after a short delay).
- **Saves:** 1–2 requests (and their auth + DB work) for users who never open those tabs.

---

### 2.8 Avoid redundant refetches

- Ensure market detail doesn’t call `loadMarket` + `loadTrades` + `loadPositions` again on tab switch; only refetch after place/cancel or explicit refresh.
- After place order, you can refetch only the market (orderbook) + that market’s positions if the combined endpoint includes them; no need for a separate trades call unless the user is on the Trades tab.

---

### 2.9 Place-order path (advanced)

- Matching already runs in one handler; the big cost is multiple round-trips to D1 inside that handler. You can:
  - Prefer single, batched queries where possible (e.g. get all maker orders in one go if you ever need more than one).
  - Use D1’s `.batch()` for multiple statements in one round-trip where the API allows.
- Keep one “place order” = one HTTP request; the main win is reducing reads on the **GET** paths above.

---

## 3. Suggested implementation order

| Priority | Action | Approx. save (per action) |
|----------|--------|----------------------------|
| 1 | Enrich GET /markets/[id] with trades + positions; frontend calls it once (2.1) | 2 requests + 2 auth + 2 handler runs per market open |
| 2 | Orderbook: one (or two) queries for whole market instead of 2×N (2.2) | ~20 reads per market open (for N=10) |
| 3 | Markets list: one outcomes query for all markets (2.3) | M−1 reads per list load |
| 4 | Positions: two queries for all best bid/ask (2.5) | 2×P − 2 reads per positions request |
| 5 | Orders list: batch trade lookups (2.4) | Up to 2×O reads per orders request |
| 6 | Cache GET /markets and GET /markets/[id] (2.6) | All reads for cached responses |
| 7 | Lazy-load trades/positions if not merged (2.7) | 1–2 requests for users who don’t open those tabs |

---

## 4. Quick reference: D1 free tier

- **Reads:** 5 million rows/day (free).
- **Writes:** 100,000 rows/day (free).

Focusing on reducing **reads** (and number of **requests** that each do multiple reads) will have the largest impact. The changes above keep behavior the same while cutting DB calls and request volume so usage is less likely to balloon on the free plan.

---

## 5. Further reductions to consider (after caching)

| Priority | Action | Expected impact |
|----------|--------|-----------------|
| 1 | **Tape:** Remove or gate the backfill UPDATE from GET /api/tape (run via cron or admin-only). | Very high: avoids O(NULL-outcome trades) × order scans per tape load. |
| 2 | **Market detail:** Relax or remove pre-submit full refetch before place order (or refetch only if form open &gt; N seconds). | Cuts duplicate market-detail reads on every place order. |
| 3 | **Market detail:** Increase refetch throttle (e.g. 45s → 2–3 min) for visibility and order-sheet open. | Fewer refetches per session. |
| 4 | **Markets list:** Volume is already limited to 30 days; consider caching volume in a table updated by a job and serve from there. | Removes trades+outcomes scan on every list load. |
| 5 | **Positions:** Avoid price_basis recalc on every request (backfill job or recalc at most once per position per day). | Large reduction when many positions have bad price_basis. |
| 6 | **Orders:** Ensure `original_contract_size` is always set; limit or batch trade fallback query. | Prevents full trades scan on GET /api/orders. |
| 7 | **Auth:** Short-lived in-worker cache for “user by id” (e.g. 10–30s TTL) so repeated requests from the same session don’t hit D1 every time. | Saves 1 read per authenticated request when cache hits. |
| 8 | **Orderbook depth:** Limit orderbook rows per outcome (e.g. best 5–10 bids/asks) in the query instead of returning all open orders. | Reduces rows read per market detail. |

---

## 6. Price_basis recalc (trades-only, no recalc on GET)

**Current behavior:**

- **Source of truth:** `price_basis` is derived only from **trades** via `recalculatePriceBasisFromTrades()` (trades table, user’s taker/maker side, FIFO long/short). That is the canonical cost basis.
- **GET /api/positions** does **not** run recalc on every request. It returns the stored `price_basis` (clamped to $1–$99 for display). So no extra trades/orders scan on the hot path.
- **Order-based helper:** `recalculatePriceBasis()` (from orders: filled/partial, original − remaining) exists for fallback/backfill but is **not** used on GET. Use it only in a one-off or scheduled backfill job if some positions have bad stored values.
- **When recalc is needed:** Run a backfill job (e.g. admin endpoint or cron) that, for positions with `price_basis = 0` or invalid, calls `recalculatePriceBasisFromTrades()` and UPDATEs the row. Do not recalc on every positions request.
