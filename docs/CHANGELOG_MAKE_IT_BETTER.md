# Changelog — Make It Better Pass

Summary of changes for performance, correctness, and maintainability (no product behavior change).

## 1. D1 indexes

- **migrations/0051_indexes_hot_queries.sql** — New migration adding composite index `idx_orders_outcome_side_status_price_time` on `orders(outcome, side, status, price, create_time)` for orderbook hot path. Tape and positions/handicaps already covered by existing indexes.

## 2. Reduce D1 reads + cache

- **functions/api/markets/[marketId]/index.ts** — Market detail: use `marketRow` naming; add `stale-while-revalidate=60` to `Cache-Control` (kept `max-age=120`).
- **functions/api/tape/index.ts** — Add `stale-while-revalidate=15` to `Cache-Control` (kept `private, max-age=30`).
- **functions/api/scoring/handicaps.ts** — Add `stale-while-revalidate=86400` to both `Cache-Control` headers (year and `year=all`).

## 3. D1 batch + atomic matching

- **functions/lib/db.ts** — Added `dbBatch(db, statements)` to run multiple prepared statements atomically (rollback on failure). Exported `D1PreparedStatement` type.
- **functions/lib/matching.ts** — Added pure `computePositionDelta(...)` for position math. Refactored `updatePosition` to use it. Refactored `executeMatching` to: read opposite orders, maker orders (one query), positions (one query); compute all writes in memory; run a single `dbBatch` for maker order updates, trade inserts, position updates, taker order update. Returns fills and trades built from batch results.
- **functions/api/markets/[marketId]/orders.ts** — Order creation: run INSERT order + UPDATE order_id via `dbBatch` (second statement uses `last_insert_rowid()`). Removed extra `dbRun` for order_id.

## 4. Atomic settlement

- **functions/lib/settlement.ts** — `settleMarket` now builds an array of statements (one UPDATE positions per row, one UPDATE outcomes) and runs them in a single `dbBatch` so settlement is all-or-nothing.

## 5. Auth hardening

- **functions/lib/db.ts** — Added optional `ENVIRONMENT` to `Env` with a short comment.
- **functions/middleware.ts** — `isAuthRequired`: require auth when `ENVIRONMENT === 'production'` or when request URL is not local (localhost, 127.0.0.1, :8788, :3000). No change to cookie handling (already HttpOnly, Secure, SameSite=Lax in auth.ts).

## 6. Standardize API errors + frontend

- **src/lib/api.ts** — Comment clarifying that API errors use `{ error: string }` and the client uses it when present. Handlers already use `errorResponse(message, status)`; no handler changes.

## 7. Observability

- **functions/_middleware.ts** — For `/api/*` requests: generate `requestId` (first 8 chars of UUID), record start time, call `next()`, then log one JSON line: `requestId`, `method`, `path`, `durationMs`. No secrets. OPTIONS response now sets CORS headers on the 204 response.

## 8. Minimal tests

- **package.json** — Added `"test": "vitest run"`, `"test:watch": "vitest"`, and devDependency `vitest`.
- **vitest.config.ts** — New config: include `functions/**/*.test.ts`, environment `node`.
- **functions/lib/matching.test.ts** — Unit tests for `canMatch` and `computePositionDelta` (long/short, weighted average, closing, clamping).
- **functions/api/markets/[marketId]/orders.test.ts** — Integration-style test: POST orders without session cookie returns 401 and `{ error: ... }`.

---

Run new migration: `wrangler d1 execute golf-trip-db --file=./migrations/0051_indexes_hot_queries.sql` (add `--remote` for production). Run tests after `npm install`: `npm run test`.
