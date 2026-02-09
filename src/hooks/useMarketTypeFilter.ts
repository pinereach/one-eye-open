import { useState, useMemo } from 'react';
import { MARKET_TYPE_ORDER, getMarketTypeLabel } from '../lib/marketTypes';

export interface MarketTypeFilterOption {
  value: string;
  label: string;
}

/**
 * Shared market-type filter for Orders, Trades, Positions pages.
 * Returns selected value, setter, filtered list, and options for the select.
 */
export function useMarketTypeFilter<T>(
  items: T[],
  getMarketType: (item: T) => string | null | undefined
): {
  selectedMarketType: string;
  setSelectedMarketType: (value: string) => void;
  filteredItems: T[];
  filterOptions: MarketTypeFilterOption[];
} {
  const [selectedMarketType, setSelectedMarketType] = useState<string>('all');

  const filterOptions = useMemo(() => {
    const types = new Set(items.map((item) => getMarketType(item) ?? 'other'));
    const sorted = [...types].sort((a, b) => {
      const i = MARKET_TYPE_ORDER.indexOf(a);
      const j = MARKET_TYPE_ORDER.indexOf(b);
      const ai = i === -1 ? MARKET_TYPE_ORDER.length : i;
      const aj = j === -1 ? MARKET_TYPE_ORDER.length : j;
      return ai - aj;
    });
    return [
      { value: 'all', label: 'All' },
      ...sorted.map((t) => ({ value: t, label: getMarketTypeLabel(t) })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedMarketType === 'all') return items;
    return items.filter((item) => (getMarketType(item) ?? 'other') === selectedMarketType);
  }, [items, selectedMarketType]);

  return {
    selectedMarketType,
    setSelectedMarketType,
    filteredItems,
    filterOptions,
  };
}
