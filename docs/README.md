# One Eye Open — Documentation

This folder contains project documentation for **One Eye Open**, a mobile-first prediction-market and scoring app for golf trips. The app runs on Cloudflare Pages with a React frontend and D1 (SQLite) database.

## What’s in this folder

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file — doc index and project overview |
| [TECHNOLOGY_OVERVIEW.md](TECHNOLOGY_OVERVIEW.md) | Tech stack, architecture, APIs, and data flow |
| [DATABASE_CALL_REDUCTION_PLAN.md](DATABASE_CALL_REDUCTION_PLAN.md) | Plan for reducing D1 read usage |
| [D1_READ_AUDIT.md](D1_READ_AUDIT.md) | Audit of D1 reads by endpoint |

## Project overview

**One Eye Open** lets users:

- **Trade** on prediction markets (team champion, individual net/gross champion, round over/under, total birdies, head-to-head matchups, hole in one).
- **View** orderbooks, recent trades, positions, and a global trade tape.
- **Score** historical rounds by course and year (for users with scoring access).
- **Manage** markets and manual trades (admin).

The UI is responsive and supports light/dark theme. Auth is session-based (cookie). Markets use a limit-order book with price-time priority matching.

## Quick start

```bash
# Install
npm install

# Build frontend (required before running Functions)
npm run build

# Local dev: frontend
npm run dev          # Vite on port 3000

# Local dev: API (separate terminal)
npm run dev:functions   # Wrangler Pages on port 8788
# Or with D1: wrangler pages dev dist --port 8788 --d1=DB=golf-trip-db
```

For full setup (D1, migrations, env vars), see the root [README.md](../README.md) and [TECHNOLOGY_OVERVIEW.md](TECHNOLOGY_OVERVIEW.md).

## Repo structure (high level)

```
├── src/                 # React app (Vite + React + TypeScript + Tailwind)
│   ├── components/      # UI and market components
│   ├── pages/           # Route-level pages
│   ├── lib/             # api, auth, format, env
│   ├── contexts/        # AuthContext
│   └── types/           # Shared TypeScript types
├── functions/          # Cloudflare Pages Functions (API)
│   ├── api/             # Handlers per route (auth, markets, tape, scoring, admin, …)
│   ├── lib/             # db, auth, matching, settlement
│   └── middleware.ts    # Auth and error handling
├── migrations/          # D1 SQL migrations (schema and data)
├── docs/                # This documentation folder
├── dist/                # Build output (static assets + Pages entry)
├── wrangler.toml        # Wrangler/Pages and D1 config
└── package.json         # Scripts and dependencies
```

## Key concepts

- **Markets** have outcomes (e.g. “Loop”, “Boose” for individual champion; “Alex Over Avayou” for H2H). Users submit limit orders; the matching engine fills trades and updates positions.
- **Handicaps** live in a dedicated `handicaps` table (player, year, index) and are shown on the individual-net-champion and H2H market detail pages (e.g. “Loop (4.5) Over Boose (20.5)”).
- **Scoring** is course/year historical data in `scores`; the scoring page and handicaps API consume it (handicaps from `handicaps` table).
- **Tape** shows the last 20 trades globally; the `/api/tape` response is cached briefly to reduce DB load.

For architecture, API list, and database summary, see [TECHNOLOGY_OVERVIEW.md](TECHNOLOGY_OVERVIEW.md).
