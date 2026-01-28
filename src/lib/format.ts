/** Price in cents → "$X" (whole dollars) */
export function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

/** Price in cents → "X.X%" */
export function formatPricePercent(cents: number): string {
  return `${(cents / 100).toFixed(1)}%`;
}

/** Price in cents → "$X.X" (one decimal) */
export function formatPriceBasis(cents: number): string {
  return `$${(cents / 100).toFixed(1)}`;
}

/** Alias for formatPriceBasis */
export const formatPriceDecimal = formatPriceBasis;

/** Notional for buy: price (cents) × contracts → "$X" */
export function formatNotional(price: number, contracts: number): string {
  const totalCents = price * contracts;
  return `$${Math.round(totalCents / 100)}`;
}

/** Notional for sell: contracts × (100 − price) → "$X" (price in cents, 100 = $1) */
export function formatNotionalSell(priceCents: number, contracts: number): string {
  const totalDollars = (10000 - priceCents) * contracts / 100;
  return `$${Math.round(totalDollars)}`;
}

/** Notional by side: buy = price×contracts, sell = contracts×(100−price) */
export function formatNotionalBySide(priceCents: number, contracts: number, side: number): string {
  return side === 1 ? formatNotionalSell(priceCents, contracts) : formatNotional(priceCents, contracts);
}

/** Price in cents → "$X" or "X¢" when under $1 */
export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars < 1) {
    return `${Math.round(cents / 10)}¢`;
  }
  return `$${Math.round(dollars)}`;
}
