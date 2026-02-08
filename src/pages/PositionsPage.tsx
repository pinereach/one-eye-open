import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { MARKET_TYPE_ORDER, getMarketTypeLabel } from '../lib/marketTypes';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { formatPrice, formatPriceBasis, formatPriceDecimal } from '../lib/format';
import { Card, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';

export function PositionsPage() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarketType, setSelectedMarketType] = useState<string>('all');

  useEffect(() => {
    loadPositions();
  }, []);

  async function loadPositions() {
    setLoading(true);
    try {
      const { positions } = await api.getAllPositions();
      setPositions(positions);
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setLoading(false);
    }
  }

  const showablePositions = positions.filter(
    (p) => p.net_position !== 0 || (p.closed_profit ?? 0) !== 0 || (p.settled_profit ?? 0) !== 0
  );

  const positionsToShow =
    selectedMarketType === 'all'
      ? showablePositions
      : showablePositions.filter((p) => (p.market_type ?? 'other') === selectedMarketType);

  const totalPositionValueCents = positionsToShow.reduce((sum, position) => {
    let contribution = 0;
    if (position.net_position !== 0) {
      const currentPrice = position.current_price !== null && position.current_price !== undefined ? position.current_price : null;
      if (currentPrice !== null) {
        const costCents = position.net_position * position.price_basis;
        contribution =
          position.net_position < 0
            ? (position.price_basis - currentPrice) * Math.abs(position.net_position)
            : position.net_position * currentPrice - costCents;
      }
    }
    contribution += (position.closed_profit ?? 0) + (position.settled_profit ?? 0);
    return sum + contribution;
  }, 0);

  const marketTypeFilterOptions = useMemo(() => {
    const types = new Set(showablePositions.map((p) => p.market_type ?? 'other'));
    const sorted = [...types].sort((a, b) => {
      const i = MARKET_TYPE_ORDER.indexOf(a);
      const j = MARKET_TYPE_ORDER.indexOf(b);
      const ai = i === -1 ? MARKET_TYPE_ORDER.length : i;
      const aj = j === -1 ? MARKET_TYPE_ORDER.length : j;
      return ai - aj;
    });
    return [{ value: 'all', label: 'All' }, ...sorted.map((t) => ({ value: t, label: getMarketTypeLabel(t) }))];
  }, [showablePositions]);

  const positionsByMarket = useMemo(() => {
    const map: Record<string, { marketLabel: string; positions: typeof positionsToShow }> = {};
    for (const p of positionsToShow) {
      const key = p.market_id ?? p.market_name ?? 'other';
      const label = p.market_name ?? p.market_id ?? 'Other';
      if (!map[key]) map[key] = { marketLabel: label, positions: [] };
      map[key].positions.push(p);
    }
    return Object.entries(map);
  }, [positionsToShow]);

  const getPositionValueCents = (position: any, currentPrice: number | null) => {
    if (currentPrice === null) return null;
    if (position.net_position < 0) {
      return (10000 - currentPrice) * Math.abs(position.net_position);
    }
    return position.net_position * currentPrice;
  };

  const renderPositionCard = (position: any) => {
    const hasOpenPosition = position.net_position !== 0;
    const currentPrice = position.current_price !== null && position.current_price !== undefined ? position.current_price : null;
    const costCents = position.net_position * position.price_basis;
    const positionValueCents = hasOpenPosition ? getPositionValueCents(position, currentPrice) : null;
    const diffCents =
      hasOpenPosition && currentPrice !== null
        ? position.net_position < 0
          ? (position.price_basis - currentPrice) * Math.abs(position.net_position)
          : position.net_position * currentPrice - costCents
        : null;

    const handleCardClick = () => {
      if (position.market_id) {
        navigate(`/markets/${position.market_id}`);
      }
    };

    const closedProfitCents = position.closed_profit ?? 0;
    const settledProfitCents = position.settled_profit ?? 0;
    const isLong = position.net_position > 0;
    const positionChipText = `${position.net_position >= 0 ? '+' : ''}${position.net_position} @ ${formatPriceBasis(position.price_basis)}`;

    const { riskCents, toProfitCents } =
      position.net_position < 0
        ? {
            riskCents: (10000 - position.price_basis) * Math.abs(position.net_position),
            toProfitCents: position.price_basis * Math.abs(position.net_position),
          }
        : {
            riskCents: position.price_basis * position.net_position,
            toProfitCents: (10000 - position.price_basis) * position.net_position,
          };

    return (
      <Card 
        key={position.id} 
        className="mb-3" 
        onClick={position.market_id ? handleCardClick : undefined}
        hover={!!position.market_id}
      >
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">{position.outcome_name || position.outcome_ticker || position.outcome}</h3>
              {hasOpenPosition ? (
                <>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${isLong ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                    {positionChipText}
                  </span>
                  <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Risk: <span className="font-medium text-red-600 dark:text-red-400">{formatPriceBasis(riskCents)}</span>
                    {' | '}
                    To Profit: <span className="font-medium text-green-600 dark:text-green-400">{formatPriceBasis(toProfitCents)}</span>
                  </p>
                </>
              ) : (
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50">
                  No Open Position
                </span>
              )}
            </div>
            {hasOpenPosition && (
              <div className="flex flex-col items-end text-right">
                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}</div>
                <div className={`text-sm sm:text-base font-semibold ${diffCents !== null ? diffCents > 0 ? 'text-green-600 dark:text-green-400' : diffCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {diffCents !== null ? <>{diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : ''} {formatPrice(Math.abs(diffCents))}</> : '—'}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 px-4 sm:px-5 py-2 rounded-b-lg bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>Closed profit: <span className={`font-medium ${closedProfitCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(closedProfitCents)}</span></span>
              <span>Settled profit: <span className={`font-medium ${settledProfitCents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(settledProfitCents)}</span></span>
            </div>
            <div className="text-right shrink-0">
              Bid: {position.best_bid != null ? formatPriceBasis(position.best_bid) : '—'} | Ask: {position.best_ask != null ? formatPriceBasis(position.best_ask) : '—'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <div className="md:hidden space-y-3">{[1, 2, 3].map(i => (<SkeletonCard key={i} />))}</div>
        <div className="hidden md:block"><SkeletonTable rows={5} cols={8} /></div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadPositions}>
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Positions</h1>
      {positionsToShow.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-600 dark:text-gray-400">Portfolio value</span>
          <span className={`text-lg sm:text-xl font-bold ${totalPositionValueCents > 0 ? 'text-green-600 dark:text-green-400' : totalPositionValueCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {totalPositionValueCents > 0 ? '+' : ''}{formatPrice(totalPositionValueCents)}
          </span>
        </div>
      )}
      {showablePositions.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Market type</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2" role="radiogroup" aria-label="Filter by market type">
            {marketTypeFilterOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation">
                <input
                  type="radio"
                  name="marketTypeFilter"
                  value={opt.value}
                  checked={selectedMarketType === opt.value}
                  onChange={() => setSelectedMarketType(opt.value)}
                  className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="md:hidden space-y-6">
        {positionsToShow.length === 0 ? (
          <EmptyState
            icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            title="No Positions"
            message="You don't have any open positions. Trade on a market to open a position."
            action={<Link to="/markets" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Browse markets</Link>}
          />
        ) : (
          positionsByMarket.map(([marketKey, { marketLabel, positions: groupPositions }]) => (
            <div key={marketKey} className="space-y-2">
              <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide sticky top-0 bg-white dark:bg-gray-900 py-1 z-10">
                {marketLabel}
              </h2>
              <div className="space-y-3">
                {groupPositions.map(renderPositionCard)}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="hidden md:block space-y-6">
        {positionsToShow.length === 0 ? (
          <EmptyState
            icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            title="No Positions"
            message="You don't have any open positions. Trade on a market to open a position."
            action={<Link to="/markets" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Browse markets</Link>}
          />
        ) : (
          positionsByMarket.map(([marketKey, { marketLabel, positions: groupPositions }]) => (
            <div key={marketKey} className="space-y-2">
              <h2 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {marketLabel}
              </h2>
              <div className="space-y-3">
                {groupPositions.map(renderPositionCard)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
