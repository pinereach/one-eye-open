# Golf Trip Exchange

A production-ready mobile-first web app for managing golf trips with live scoring, betting exchange, and settlement ledger. Built for Cloudflare Pages with D1 database.

## Features

- **Authentication**: Email/password auth with secure sessions
- **Scoring**: Enter CROSS and NET scores for 5 rounds per trip
- **Betting Exchange**: Prediction-market style exchange with real-time order matching
- **Settlement**: Automated PnL calculation and minimal transfer ledger
- **Dark Mode**: Toggle between light and dark themes
- **Mobile-First**: Responsive design optimized for mobile devices

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages

## Project Structure

```
one-eye-open/
├── functions/              # Cloudflare Pages Functions (API)
│   ├── api/               # API endpoints
│   ├── middleware.ts      # Auth middleware
│   └── _middleware.ts     # Pages Functions middleware
├── src/
│   ├── components/       # React components
│   ├── lib/              # Core utilities (db, auth, matching, settlement)
│   ├── hooks/            # React hooks
│   ├── types/            # TypeScript types
│   └── App.tsx           # Main app component
├── migrations/           # D1 database migrations
└── public/              # Static assets
```

## Setup

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd one-eye-open
```

2. Install dependencies:
```bash
npm install
```

3. Create a Cloudflare D1 database:
```bash
wrangler d1 create golf-trip-db
```

4. Update `wrangler.toml` with your database ID:
   - Copy the database ID from the output
   - Replace `YOUR_DATABASE_ID_HERE` in `wrangler.toml` with your actual database ID

5. Run migrations:
```bash
npm run migrate
npm run seed
```

6. Set up environment variables (optional):
   - Create `.dev.vars` for local development:
     ```
     MAX_EXPOSURE_CENTS=500000
     SESSION_SECRET=your-secret-key
     SESSION_DURATION_DAYS=14
     ```

## Development

### Local Development

1. Start the development server:
```bash
npm run dev
```

2. In another terminal, start the Wrangler dev server for Pages Functions:
```bash
wrangler pages dev dist --d1=DB=golf-trip-db
```

Note: For full local development, you'll need to run both the Vite dev server and Wrangler Pages dev server. The Vite server handles the frontend, while Wrangler handles the API functions.

### Building

Build the frontend:
```bash
npm run build
```

## Deployment

### Cloudflare Pages Deployment

1. **Connect to GitHub** (recommended):
   - Go to Cloudflare Dashboard > Pages
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variables in the dashboard

2. **Manual Deployment**:
```bash
npm run build
wrangler pages deploy dist
```

3. **Configure D1 Database Binding**:
   - In Cloudflare Dashboard > Pages > Your Project > Settings > Functions
   - Add D1 database binding:
     - Variable name: `DB`
     - D1 database: `golf-trip-db`

4. **Set Environment Variables** (in Cloudflare Dashboard):
   - `MAX_EXPOSURE_CENTS`: Maximum exposure per user in cents (default: 500000 = $5,000)
   - `SESSION_SECRET`: Secret key for session token hashing
   - `SESSION_DURATION_DAYS`: Session expiration in days (default: 14)

## Database Migrations

### Running Migrations

```bash
# Run initial schema
wrangler d1 execute golf-trip-db --file=./migrations/0001_initial.sql

# Seed demo data
wrangler d1 execute golf-trip-db --file=./migrations/0002_seed_data.sql
```

### Database Schema

The database includes the following tables:
- `users` - User accounts
- `sessions` - Authentication sessions
- `trips` - Golf trips
- `trip_members` - Trip membership
- `rounds` - Golf rounds (1-5 per trip)
- `round_scores` - Player scores (CROSS and NET)
- `markets` - Betting markets
- `orders` - Limit orders
- `trades` - Executed trades
- `positions` - User positions per market
- `ledger_entries` - Settlement ledger

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Trips
- `GET /api/trips` - List all trips
- `GET /api/trips/:id` - Get trip details

### Markets
- `GET /api/markets` - List markets (query: `?tripId=...&status=...`)
- `GET /api/markets/:id` - Get market details with orderbook
- `POST /api/markets/:id/orders` - Place order
- `GET /api/markets/:id/trades` - Get recent trades
- `GET /api/markets/:id/positions` - Get user positions

### Scoring
- `GET /api/scoring/rounds` - List rounds (query: `?tripId=...&roundId=...`)
- `POST /api/scoring/rounds?roundId=...` - Update score

### Settlement
- `POST /api/trips/:tripId/markets/:marketId/settle` - Settle market (admin only)

### Ledger
- `GET /api/ledger` - Get ledger entries (query: `?tripId=...`)

### Export
- `GET /api/export?type=scores&tripId=...` - Export scores as CSV
- `GET /api/export?type=trades&tripId=...` - Export trades as CSV
- `GET /api/export?type=ledger&tripId=...` - Export ledger as CSV

## Matching Engine

The matching engine implements:
- **Price-Time Priority**: Orders matched by best price first, then by time
- **Partial Fills**: Orders can be partially filled
- **Atomic Updates**: All updates (orders, trades, positions) happen atomically
- **Exposure Limits**: Per-user maximum exposure enforcement

### Matching Rules
- Bids match against lowest ask <= bid price
- Asks match against highest bid >= ask price
- Trades execute at maker's price (price-time priority)
- Positions updated with weighted average prices

## Settlement

Settlement process:
1. Admin settles market with settle_value (0 or 10000)
2. Calculate PnL for all positions
3. Aggregate per-user balances across all markets in trip
4. Generate minimal transfer ledger using netting algorithm
5. Create ledger entries

## Seed Data

The seed data includes:
- 12 users (mix of players, observers, admin)
  - All seeded users have password: `password123`
  - You can also register new users through the UI
- 1 demo trip
- 5 rounds (round 1 active)
- Sample markets (all types)
- Sample orders and trades
- Initial positions

## Environment Variables

- `MAX_EXPOSURE_CENTS` (default: 500000) - Maximum exposure per user in cents
- `SESSION_SECRET` - Secret key for session token hashing
- `SESSION_DURATION_DAYS` (default: 14) - Session expiration in days

## License

MIT
