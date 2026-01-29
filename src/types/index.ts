export interface User {
  id: number;
  username: string;
  view_scores?: boolean;
  view_market_maker?: boolean;
  view_market_creation?: boolean;
  admin?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  created_at: number;
}

export interface Outcome {
  id: number;
  outcome_id: string;
  name: string;
  ticker: string;
  market_id: string;
  strike: string;
  settled_price: number | null;
  created_date: number;
}

export interface Market {
  id: number;
  market_id: string;
  short_name: string;
  symbol: string;
  max_winners: number;
  min_winners: number;
  created_date: number;
  market_type?: string | null;
  outcomes?: Outcome[];
}

export interface Order {
  id: number;
  create_time: number;
  user_id: number | null;
  token: string;
  order_id: number;
  outcome: string;
  price: number;
  status: 'open' | 'partial' | 'filled' | 'canceled';
  tif: string;
  side: number; // 0 = bid, 1 = ask
  contract_size: number | null; // For backward compatibility, shows filled/original size
  original_size?: number | null; // Original order size
  remaining_size?: number | null; // Remaining quantity to fill
  outcome_name?: string; // For display
  market_name?: string; // For display
}

export interface Trade {
  id: number;
  token: string;
  price: number;
  contracts: number;
  create_time: number;
  risk_off_contracts: number;
  risk_off_price_diff: number;
  outcome?: string | null;
  outcome_name?: string | null;
  outcome_ticker?: string | null;
  market_id?: string | null;
  market_short_name?: string | null;
  side?: number | null; // 0 = bid/buy, 1 = ask/sell
}

export interface Position {
  id: number;
  user_id: number | null;
  outcome: string;
  create_time: number;
  closed_profit: number;
  settled_profit: number;
  net_position: number;
  price_basis: number;
  is_settled: number; // 0 = false, 1 = true
  current_price?: number | null; // Current midpoint price from orderbook
  market_id?: string; // Market ID for navigation
  market_name?: string; // For display
  outcome_ticker?: string; // For display
  outcome_name?: string; // For display
}

// LedgerEntry removed - ledger functionality removed
