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

/** Notional: price (cents) × contracts → "$X" */
export function formatNotional(price: number, contracts: number): string {
  const totalCents = price * contracts;
  return `$${Math.round(totalCents / 100)}`;
}

/** Price in cents → "$X" or "X¢" when under $1 */
export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars < 1) {
    return `${Math.round(cents / 10)}¢`;
  }
  return `$${Math.round(dollars)}`;
}
