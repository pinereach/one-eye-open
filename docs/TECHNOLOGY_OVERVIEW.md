# Technology Overview

This document describes the tech stack, architecture, APIs, and data model for **One Eye Open**.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 7, Tailwind CSS, React Router 6 |
| **Backend** | Cloudflare Pages Functions (serverless, on the edge) |
| **Database** | Cloudflare D1 (SQLite) |
| **Hosting** | Cloudflare Pages (static assets + Functions) |
| **CLI / deploy** | Wrangler (Cloudflare) |

The app is a single-page application (SPA). The frontend is built with Vite into `dist/`; Pages serves `dist/` and runs Functions for `/api/*` routes. D1 is bound to Functions as `env.DB`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                             │
│  - Vite build → static HTML/JS/CSS in dist/                       │
│  - API calls to /api/* with credentials: include (cookies)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Pages                                                 │
│  - Serves dist/ for /*                                            │
│  - Invokes Functions for /api/*                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pages Functions (functions/)                                     │
│  - _middleware.ts: runs first (auth, error handling)             │
│  - api/auth/*, api/markets/*, api/tape, api/scoring/*, etc.      │
│  - Shared: lib/db.ts, lib/auth.ts, lib/matching.ts, middleware  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare D1 (SQLite)                                           │
│  - users, sessions, markets, outcomes, orders, trades, positions │
│  - scores, handicaps, participants, market_volume (cache)        │
└─────────────────────────────────────────────────────────────────┘
```

- **Auth:** Session cookie (`session`) is set by login/register. `requireAuth()` in middleware (or per-handler) reads the cookie, looks up the user in D1, and attaches `user` to the request. In development, auth can be disabled so the app works without logging in.
- **Frontend API:** `src/lib/api.ts` defines `api.*` methods that `fetch` `/api/...` with `credentials: 'include'`. Cacheable GETs (e.g. markets, market detail, handicaps) do not append a cache-busting query param so the browser can reuse cached responses when the server sends `Cache-Control`.

---

## Data flow (high level)

1. **Auth:** Login/register hit `/api/auth/login` or `/api/auth/register`; server creates a session row and sets a `session` cookie. Subsequent requests send the cookie; `requireAuth()` resolves the user from D1.
2. **Markets:** `GET /api/markets` returns market list (optionally cached). `GET /api/markets/:id` returns one market with outcomes, orderbook, trades, and positions. Order placement is `POST /api/markets/:id/orders`; the handler uses the matching engine, writes orders/trades/positions, and returns fills.
3. **Tape:** `GET /api/tape?limit=20` returns the last 20 trades globally (with buyer/seller usernames, outcome, market). Response is cached briefly (e.g. 30s) to reduce D1 reads.
4. **Scoring:** `GET /api/scoring/scores` returns historical scores (course, year, player); `GET /api/scoring/handicaps?year=2026` or `year=all` returns handicaps from the `handicaps` table for display on individual-net-champion and H2H markets.
5. **Admin:** Admin-only routes (cancel orders, pause markets, manual trades, refresh volume, user list) check `user.admin` (or equivalent) after `requireAuth()`.

---

## API summary

All API routes live under `/api`. Auth is required for most routes unless otherwise noted; in production, `requireAuth()` enforces the session cookie.

| Area | Method | Path | Description |
|------|--------|------|-------------|
| **Auth** | POST | `/auth/register` | Register; returns user, sets session cookie |
| | POST | `/auth/login` | Login; returns user, sets session cookie |
| | POST | `/auth/logout` | Clear session |
| | GET | `/auth/me` | Current user (or null) |
| **Participants** | GET | `/participants` | List participants (for market suggestions, etc.) |
| **Markets** | GET | `/markets` | List markets (cached) |
| | GET | `/markets/:id` | Market detail + outcomes + orderbook + trades + positions (cached) |
| | POST | `/markets/:id/orders` | Place limit order (matching, trades, positions) |
| | GET | `/markets/:id/trades` | Recent trades for market |
| | GET | `/markets/:id/positions` | User positions for market |
| | POST | `/markets/suggest` | Create market/outcomes (e.g. H2H, round O/U) |
| | POST | `/markets/:id/settle` | Settle market (admin/settlement) |
| **Orders** | GET | `/orders` | Current user’s orders |
| | DELETE | `/orders/:id` | Cancel order |
| **Trades** | GET | `/trades` | Current user’s trades |
| **Positions** | GET | `/positions` | Current user’s positions |
| **Tape** | GET | `/tape?limit=20` | Last N global trades (default/max 20), short cache |
| **Scoring** | GET | `/scoring/scores` | Historical scores (optional course/year); auth + view_scores |
| | POST | `/scoring/scores` | Create/update score (view_scores) |
| | GET | `/scoring/handicaps?year=2026` | Handicaps for year (default 2026) or `year=all`; public, cached |
| | GET | `/scoring/rounds` | Stub (e.g. empty) |
| **Admin** | GET | `/admin/users` | List users (admin) |
| | POST | `/admin/orders/cancel-all` | Cancel orders (optionally by user) |
| | PATCH | `/admin/markets/:id` | Pause/resume market |
| | POST | `/admin/trades/manual` | Create manual trade |
| | POST | `/admin/refresh-volume` | Refresh market volume cache |
| **Other** | GET | `/export?type=trades` | Export trades CSV |
| | GET | `/debug/schema?key=...` | DB schema (optional; requires env key) |

---

## Database (D1 / SQLite)

Migrations live in `migrations/` and are applied with `wrangler d1 execute <db> --file=./migrations/....sql` (local or `--remote`).

### Core tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts (username, password hash, view_scores, view_market_maker, view_market_creation, admin) |
| `sessions` | Auth sessions (token hash, user_id, expiry) |
| `markets` | Markets (market_id, short_name, symbol, market_type, trading_paused, etc.) |
| `outcomes` | Outcomes per market (outcome_id, name, ticker, market_id) |
| `orders` | Limit orders (user_id, outcome, side, price, status, contract_size, etc.) |
| `trades` | Executed trades (price, contracts, create_time, outcome, taker_user_id, maker_user_id, taker_side) |
| `positions` | User positions per outcome (user_id, outcome, net_position, price_basis, etc.) |

### Supporting tables

| Table | Purpose |
|-------|---------|
| `participants` | Participant list (e.g. for market suggestions and H2H names) |
| `scores` | Historical scoring (course, year, player, score, index_number) |
| `handicaps` | Handicap index per player per year (player, year, handicap_index); used for net champion and H2H display |
| `market_volume` | Cached volume per market (refreshed by admin/cron) |

### How volume populates

- **Source:** Volume is “contracts traded” per market. It is **not** computed live from `trades` on every request; that would be too heavy. Instead it uses the **`market_volume`** cache table.
- **List page:** `GET /api/markets` does a `LEFT JOIN market_volume` and returns `COALESCE(mv.volume_contracts, 0)`. If the table is empty or missing, every market shows 0.
- **Detail page:** `GET /api/markets/:id` now also reads `volume_contracts` from `market_volume` for that market and attaches it to the market object so the volume chip shows total market volume.
- **Refreshing the cache:** `POST /api/admin/refresh-volume` (admin-only) sums `t.contracts` from `trades` joined to `outcomes` for the last 30 days, grouped by `market_id`, and upserts into `market_volume`. Run this periodically (e.g. cron every 4h) or manually after migrations so list and detail show non-zero volume. Migration `0049_market_volume_cache.sql` must be applied before the table exists.

Indexes (examples): `idx_trades_create_time`, `idx_orders_user_id`, `idx_orders_outcome`, `idx_positions_user_outcome`, `idx_handicaps_year`. Matching and settlement logic use these for efficient queries.

---

## Caching

- **Server:** Some responses set `Cache-Control` (e.g. handicaps 48h, tape 30s, historical scores 1 week when year &lt; current).
- **Client:** `src/lib/api.ts` treats certain GETs as cacheable (markets list, market detail, participants, handicaps) and does not add `_t=` for them, so the browser can cache per URL. Other GETs add a cache-busting query param.

---

## Matching engine

Order placement uses shared logic (e.g. `functions/lib/matching.ts`) to:

- Match new orders against the book (price-time priority).
- Create trades, update or insert orders, update positions (weighted average price).
- Enforce exposure limits (e.g. `MAX_EXPOSURE_CENTS`).

Settlement (e.g. `POST /markets/:id/settle`) computes PnL from positions and settle value and can write ledger entries or equivalent.

### Pricing precision and rounding

All prices and P&amp;L are stored in **integer cents** (2 decimal places in dollars: $1.00–$99.00). In the DB:

- **orders.price**, **trades.price**, **positions.price_basis**: INTEGER, valid range 100–9900 (cents).
- **positions.closed_profit**, **positions.settled_profit**: INTEGER (cents, i.e. P&L to the cent).

There is no fractional cent (e.g. no $65.505). When we compute a **weighted average price_basis** (e.g. 5 @ $64 + 10 @ $65 → 15 @ $64.666…), we must round to the nearest cent before persisting. That rounding can differ between the two sides of a trade (taker vs maker), which historically produced small system-total drift (e.g. −$0.08). To keep zero-sum:

- **New fills** use `updatePositionsForFill`: we round one side’s basis and set the other so `taker_cost + maker_cost` equals the exact total; any residual goes into maker’s `closed_profit`.
- **Leaderboard** reports system total as $0 when the raw sum is within ±10¢ (legacy drift).

---

## Frontend structure

- **Entry:** `src/main.tsx` mounts the app; `src/App.tsx` defines router, layout, and lazy-loaded routes (Landing, Markets, Market Detail, Tape, Orders, Trades, Positions, Scoring, Market Suggestions, Settings, Admin).
- **State:** Auth is in `AuthContext`; most data is fetched per page or component via `api.*` and local state.
- **Styling:** Tailwind with a primary palette and dark mode (class-based).
- **Key pages:** Market detail uses shared components (Orderbook, TradeTape, etc.) and shows handicaps on individual-net-champion and H2H markets via `api.getHandicaps(2026)` or fallback to 2025.

For setup, scripts, and deployment, see the root [README.md](../README.md). For D1 read reduction and audits, see [DATABASE_CALL_REDUCTION_PLAN.md](DATABASE_CALL_REDUCTION_PLAN.md) and [D1_READ_AUDIT.md](D1_READ_AUDIT.md).
