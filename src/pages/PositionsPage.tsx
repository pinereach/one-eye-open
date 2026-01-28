import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatPrice, formatPriceBasis, formatPriceDecimal } from '../lib/format';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton, SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';

export function PositionsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalPositionValueCents = positions.reduce((sum, position) => {
    const currentPrice = position.current_price !== null && position.current_price !== undefined ? position.current_price : null;
    const costCents = position.net_position * position.price_basis;
    const positionValueCents = currentPrice !== null ? position.net_position * currentPrice : null;
    const diffCents = positionValueCents !== null ? positionValueCents - costCents : 0;
    return sum + diffCents;
  }, 0);

  const renderPositionCard = (position: any) => {
    const currentPrice = position.current_price !== null && position.current_price !== undefined ? position.current_price : null;
    const costCents = position.net_position * position.price_basis;
    const positionValueCents = currentPrice !== null ? position.net_position * currentPrice : null;
    const diffCents = positionValueCents !== null ? positionValueCents - costCents : null;

    return (
      <Card key={position.id} className="mb-3">
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">{position.outcome_ticker || position.outcome_name || position.outcome}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">{position.market_name || 'N/A'}</p>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">{position.net_position} shares at {formatPriceBasis(position.price_basis)}</div>
            </div>
            <div className="flex flex-col items-end text-right">
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}</div>
              <div className={`text-sm sm:text-base font-semibold ${diffCents !== null ? diffCents > 0 ? 'text-green-600 dark:text-green-400' : diffCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {diffCents !== null ? <>{diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : ''} {formatPrice(Math.abs(diffCents))}</> : '—'}
              </div>
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
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Positions</h1>
      {positions.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-600 dark:text-gray-400">Portfolio value</span>
          <span className={`text-lg sm:text-xl font-bold ${totalPositionValueCents > 0 ? 'text-green-600 dark:text-green-400' : totalPositionValueCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
            {totalPositionValueCents > 0 ? '+' : ''}{formatPrice(totalPositionValueCents)}
          </span>
        </div>
      )}
      <div className="md:hidden space-y-3">
        {positions.length === 0 ? (
          <Card><CardContent><p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No positions found</p></CardContent></Card>
        ) : (
          positions.map(renderPositionCard)
        )}
      </div>
      <div className="hidden md:block space-y-3">
        {positions.length === 0 ? (
          <Card><CardContent><p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No positions found</p></CardContent></Card>
        ) : (
          positions.map(renderPositionCard)
        )}
      </div>
    </div>
  );
}
