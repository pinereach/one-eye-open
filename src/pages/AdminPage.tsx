import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { ToastContainer, useToast } from '../components/ui/Toast';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, showToast } = useToast();
  const [replayBusy, setReplayBusy] = useState(false);

  if (user && !user.admin) {
    return <Navigate to="/markets" replace />;
  }

  async function runReplay(fullReset: boolean) {
    setReplayBusy(true);
    try {
      let res = await api.adminReplayPositions(fullReset ? { full_reset: true } : undefined);
      let total = res.trades_replayed;
      while (res.has_more && res.after_trade_id != null) {
        res = await api.adminReplayPositions({ after_trade_id: res.after_trade_id });
        total += res.trades_replayed;
      }
      showToast(res.message ?? `Done. ${total} trades replayed.`, 'success');
      if (res.trades_skipped != null && res.trades_skipped > 0) {
        showToast(`${res.trades_skipped} trade(s) skipped (missing taker_user_id or taker_side)`, 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to replay positions', 'error');
    } finally {
      setReplayBusy(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/markets')}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold">Admin</h1>

      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-3">Ensure portfolio values are zero-sum</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Portfolio value (unrealized P&amp;L) should sum to zero across all positions. Replay recomputes <code className="text-xs">net_position</code> and <code className="text-xs">price_basis</code> from trade history so both sides of every fill are applied correctly. Use <strong>Replay positions</strong> to fix positions incrementally, or <strong>Replay with full reset</strong> to zero all positions first and replay from scratch (clean slate).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runReplay(false)}
              disabled={replayBusy}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {replayBusy ? 'Running…' : 'Replay positions'}
            </button>
            <button
              type="button"
              onClick={() => runReplay(true)}
              disabled={replayBusy}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Replay with full reset
            </button>
          </div>
        </CardContent>
      </Card>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
