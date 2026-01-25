export interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  created_at: number;
}

export interface Trip {
  id: string;
  name: string;
  start_date: number;
  created_at: number;
}

export interface Round {
  id: string;
  trip_id: string;
  round_no: number;
  name: string;
  date: number;
  is_active: number;
}

export interface RoundScore {
  id: string;
  round_id: string;
  user_id: string;
  cross_score: number | null;
  net_score: number | null;
  updated_at: number;
  display_name?: string;
  email?: string;
}

export interface Market {
  id: string;
  trip_id: string;
  type: string;
  round_id: string | null;
  subject_user_id: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'closed' | 'settled' | 'void';
  settle_value: number | null;
  created_at: number;
}

export interface Order {
  id: string;
  market_id: string;
  user_id: string;
  side: 'bid' | 'ask';
  price_cents: number;
  qty_contracts: number;
  qty_remaining: number;
  status: 'open' | 'partial' | 'filled' | 'canceled';
  created_at: number;
}

export interface Trade {
  id: string;
  market_id: string;
  taker_order_id: string;
  maker_order_id: string;
  price_cents: number;
  qty_contracts: number;
  created_at: number;
}

export interface Position {
  id: string;
  market_id: string;
  user_id: string;
  qty_long: number;
  qty_short: number;
  avg_price_long_cents: number | null;
  avg_price_short_cents: number | null;
  updated_at: number;
}

export interface LedgerEntry {
  id: string;
  trip_id: string;
  user_id: string;
  counterparty_user_id: string;
  amount_cents: number;
  reason: string;
  user_name?: string;
  counterparty_name?: string;
}
