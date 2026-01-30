import { useLocation } from 'react-router-dom';
import { MarketList } from '../components/markets/MarketList';

export function MarketsPage() {
  const location = useLocation();
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key forces remount and refetch when navigating to this page so new markets (e.g. H2H) show up */}
      <MarketList key={location.key} />
    </div>
  );
}
