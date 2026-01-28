import { MarketList } from '../components/markets/MarketList';

export function MarketsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Markets</h1>
      </div>
      <MarketList />
    </div>
  );
}
