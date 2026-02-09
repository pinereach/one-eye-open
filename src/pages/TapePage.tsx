import { useRef } from 'react';
import { TradeTape } from '../components/markets/TradeTape';
import { PullToRefresh } from '../components/ui/PullToRefresh';

export function TapePage() {
  const tapeRef = useRef<{ refresh: () => Promise<void> }>(null);

  return (
    <PullToRefresh onRefresh={async () => { await tapeRef.current?.refresh(); }}>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Trade tape</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent activity across all markets</p>
        </div>
        <TradeTape ref={tapeRef} showTitle={false} />
      </div>
    </PullToRefresh>
  );
}
