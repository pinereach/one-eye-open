import { describe, it, expect } from 'vitest';
import { computePositionDelta, canMatch } from './matching';

describe('canMatch', () => {
  it('matches when bid >= ask', () => {
    expect(canMatch(5000, 5000)).toBe(true);
    expect(canMatch(5100, 5000)).toBe(true);
  });
  it('does not match when bid < ask', () => {
    expect(canMatch(4900, 5000)).toBe(false);
  });
});

describe('computePositionDelta', () => {
  it('going long from flat: net position and basis set from fill', () => {
    const r = computePositionDelta(0, 0, 0, 'bid', 5000, 10);
    expect(r.net_position).toBe(10);
    expect(r.price_basis).toBe(5000);
    expect(r.closed_profit).toBe(0);
  });

  it('adding to long: weighted average basis', () => {
    const r = computePositionDelta(10, 5000, 0, 'bid', 6000, 10);
    expect(r.net_position).toBe(20);
    expect(r.price_basis).toBe(5500);
    expect(r.closed_profit).toBe(0);
  });

  it('closing long partially: reduces net, adds closed profit', () => {
    const r = computePositionDelta(10, 5000, 0, 'ask', 6000, 5);
    expect(r.net_position).toBe(5);
    expect(r.price_basis).toBe(5000);
    expect(r.closed_profit).toBe((6000 - 5000) * 5);
  });

  it('going short from flat', () => {
    const r = computePositionDelta(0, 0, 0, 'ask', 5000, 10);
    expect(r.net_position).toBe(-10);
    expect(r.price_basis).toBe(5000);
    expect(r.closed_profit).toBe(0);
  });

  it('closing short partially: buy to close', () => {
    const r = computePositionDelta(-10, 5000, 0, 'bid', 4000, 5);
    expect(r.net_position).toBe(-5);
    expect(r.price_basis).toBe(5000);
    expect(r.closed_profit).toBe((5000 - 4000) * 5);
  });

  it('clamps price_basis to $1–$99', () => {
    const r = computePositionDelta(10, 5000, 0, 'bid', 50, 5);
    expect(r.price_basis).toBeGreaterThanOrEqual(100);
    expect(r.price_basis).toBeLessThanOrEqual(9900);
  });
});
