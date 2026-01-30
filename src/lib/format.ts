/** True when value in cents is a whole number of dollars (no fractional cents). */
function isWholeDollars(cents: number): boolean {
  return Number.isInteger(cents) && cents % 100 === 0;
}

/** Price in cents → "$X" or "$X.XX" when fractional (e.g. $1.50) */
export function formatPrice(cents: number): string {
  if (isWholeDollars(cents)) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

/** Price in cents → "X.X%" or "X%" when whole */
export function formatPricePercent(cents: number): string {
  const pct = cents / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
}

/** Price in cents → "$X" or "$X.XX" when fractional (e.g. $1.50) */
export function formatPriceBasis(cents: number): string {
  if (isWholeDollars(cents)) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

/** Alias for formatPriceBasis */
export const formatPriceDecimal = formatPriceBasis;

/** Notional for buy: price (cents) × contracts → "$X" or "$X.XX" when fractional */
export function formatNotional(price: number, contracts: number): string {
  const totalCents = price * contracts;
  if (isWholeDollars(totalCents)) return `$${totalCents / 100}`;
  return `$${(totalCents / 100).toFixed(2)}`;
}

/** Notional for sell: contracts × (100 − price) → "$X" or "$X.XX" when fractional (price in cents, 100 = $1) */
export function formatNotionalSell(priceCents: number, contracts: number): string {
  const totalCents = (10000 - priceCents) * contracts;
  if (isWholeDollars(totalCents)) return `$${totalCents / 100}`;
  return `$${(totalCents / 100).toFixed(2)}`;
}

/** Notional by side: buy = price×contracts, sell = contracts×(100−price) */
export function formatNotionalBySide(priceCents: number, contracts: number, side: number): string {
  return side === 1 ? formatNotionalSell(priceCents, contracts) : formatNotional(priceCents, contracts);
}

/** Price in cents → "$X", "$X.XX" when fractional, or "X¢" when under $1 */
export function formatPriceCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars < 1) {
    if (Number.isInteger(cents)) return `${cents}¢`;
    return `${(cents).toFixed(1)}¢`;
  }
  if (isWholeDollars(cents)) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}
