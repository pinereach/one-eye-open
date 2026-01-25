import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { LedgerEntry } from '../../types';

interface LedgerViewProps {
  tripId?: string;
}

export function LedgerView({ tripId }: LedgerViewProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLedger();
  }, [tripId]);

  async function loadLedger() {
    setLoading(true);
    try {
      const { entries } = await api.getLedger(tripId);
      setEntries(entries);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatAmount = (cents: number) => {
    const dollars = cents / 100;
    return `$${dollars >= 0 ? '+' : ''}${dollars.toFixed(2)}`;
  };

  if (loading) {
    return <div className="text-center py-8">Loading ledger...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settlement Ledger</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="text-left p-2">From</th>
              <th className="text-left p-2">To</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500 dark:text-gray-400">
                  No ledger entries yet
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="p-2">{entry.user_name || entry.user_id}</td>
                  <td className="p-2">{entry.counterparty_name || entry.counterparty_user_id}</td>
                  <td className={`p-2 text-right font-medium ${
                    entry.amount_cents >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatAmount(entry.amount_cents)}
                  </td>
                  <td className="p-2 text-sm text-gray-600 dark:text-gray-400">
                    {entry.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
