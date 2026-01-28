import { TradeTape } from '../components/markets/TradeTape';

export function TapePage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Trade tape</h1>
      <TradeTape showTitle={false} />
    </div>
  );
}
