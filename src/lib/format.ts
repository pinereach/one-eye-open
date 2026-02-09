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

/** Alias for formatPrice (same behavior; name used for cost-basis display). */
export const formatPriceBasis = formatPrice;

/** Alias for formatPriceBasis */
export const formatPriceDecimal = formatPriceBasis;

/** Round cents to nearest 10 (for display only). */
export function roundCentsToNearest10(cents: number): number {
  return Math.round(cents / 10) * 10;
}

/** Position value: round to nearest $0.10, display with 2 decimals (e.g. $12.30, $155.00). */
export function formatPriceRound10(cents: number): string {
  const rounded = roundCentsToNearest10(cents);
  return `$${(rounded / 100).toFixed(2)}`;
}

/** Closed/settled profit: always 2 decimal places (e.g. $2.00, $-6.00, $1.50). */
export function formatPriceTwoDecimals(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
