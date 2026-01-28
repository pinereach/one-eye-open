import { useLocation } from 'react-router-dom';
import { MarketList } from '../components/markets/MarketList';
import { TradeTape } from '../components/markets/TradeTape';

export function MarketsPage() {
  const location = useLocation();
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Markets</h1>
      </div>
      <TradeTape />
      {/* Key forces remount and refetch when navigating to this page so new markets (e.g. H2H) show up */}
      <MarketList key={location.key} />
    </div>
  );
}
