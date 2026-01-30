import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Market } from '../types';

// Throttle admin data fetch: avoid duplicate requests from React Strict Mode or rapid re-mounts.
const ADMIN_FETCH_THROTTLE_MS = 3000;
let lastAdminFetchAt = 0;

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const hasFetchedRef = useRef(false);

  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [cancelAllConfirmOpen, setCancelAllConfirmOpen] = useState(false);
  const [cancelAllUserConfirmOpen, setCancelAllUserConfirmOpen] = useState(false);
  const [cancelUserId, setCancelUserId] = useState<number | null>(null);
  const [cancelAllBusy, setCancelAllBusy] = useState(false);
  const [cancelUserBusy, setCancelUserBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState<Record<string, boolean>>({});
  const [manualTradeBusy, setManualTradeBusy] = useState(false);

  // Manual trade form (taker = user who took; maker = user whose order was hit; side = taker's side)
  const [manualTakerUserId, setManualTakerUserId] = useState<number | ''>('');
  const [manualMakerUserId, setManualMakerUserId] = useState<number | ''>('');
  const [manualMarketId, setManualMarketId] = useState<string>('');
  const [manualOutcomeId, setManualOutcomeId] = useState<string>('');
  const [manualSide, setManualSide] = useState<'bid' | 'ask'>('bid');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualContracts, setManualContracts] = useState<string>('');

  // Load once per visit when user is admin. Throttle + ref prevent duplicate runs (e.g. Strict Mode).
  useEffect(() => {
    if (!user?.admin) return;
    if (hasFetchedRef.current) return;
    const now = Date.now();
    if (now - lastAdminFetchAt < ADMIN_FETCH_THROTTLE_MS) return;
    hasFetchedRef.current = true;
    lastAdminFetchAt = now;

    let cancelled = false;
    setLoadingMarkets(true);
    Promise.all([api.adminGetUsers(), api.getMarkets()])
      .then(([usersRes, marketsRes]) => {
        if (cancelled) return;
        setUsers(usersRes.users ?? []);
        setMarkets(marketsRes.markets ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          hasFetchedRef.current = false;
          showToast('Failed to load admin data', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMarkets(false);
      });
    return () => {
      cancelled = true;
      // Reset throttle after delay so Strict Mode’s second mount doesn’t refetch, but returning to admin later does
      setTimeout(() => { lastAdminFetchAt = 0; }, ADMIN_FETCH_THROTTLE_MS + 500);
    };
  }, [user?.admin]);

  if (user && !user.admin) {
    return <Navigate to="/markets" replace />;
  }

  const selectedMarket = markets.find((m) => m.market_id === manualMarketId);
  const outcomes = selectedMarket?.outcomes ?? [];

  async function handleCancelAllOrders() {
    setCancelAllBusy(true);
    try {
      const { canceled } = await api.adminCancelAllOrders();
      showToast(`${canceled} order(s) canceled`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel orders', 'error');
    } finally {
      setCancelAllBusy(false);
      setCancelAllConfirmOpen(false);
    }
  }

  async function handleCancelAllOrdersForUser() {
    if (cancelUserId == null) return;
    setCancelUserBusy(true);
    try {
      const { canceled } = await api.adminCancelAllOrders(cancelUserId);
      const u = users.find((x) => x.id === cancelUserId);
      showToast(`${canceled} order(s) canceled for ${u?.username ?? cancelUserId}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to cancel orders', 'error');
    } finally {
      setCancelUserBusy(false);
      setCancelAllUserConfirmOpen(false);
      setCancelUserId(null);
    }
  }

  async function handlePauseResume(marketId: string, tradingPaused: boolean) {
    setPauseBusy((prev) => ({ ...prev, [marketId]: true }));
    try {
      await api.adminUpdateMarketPause(marketId, tradingPaused);
      setMarkets((prev) =>
        prev.map((m) =>
          m.market_id === marketId ? { ...m, trading_paused: tradingPaused ? 1 : 0 } : m
        )
      );
      showToast(tradingPaused ? 'Market paused' : 'Market resumed', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update market', 'error');
    } finally {
      setPauseBusy((prev) => ({ ...prev, [marketId]: false }));
    }
  }

  async function handleManualTrade(e: React.FormEvent) {
    e.preventDefault();
    const takerId = manualTakerUserId === '' ? null : Number(manualTakerUserId);
    const makerId = manualMakerUserId === '' ? null : Number(manualMakerUserId);
    const price = manualPrice.trim() ? parseInt(manualPrice, 10) : NaN;
    const contracts = manualContracts.trim() ? parseInt(manualContracts, 10) : NaN;
    if (takerId == null || !manualMarketId || !manualOutcomeId || Number.isNaN(price) || price < 100 || price > 9900 || Number.isNaN(contracts) || contracts < 1) {
      showToast('Fill required fields: taker, market, outcome, price (100–9900), contracts (≥1)', 'error');
      return;
    }
    setManualTradeBusy(true);
    try {
      await api.adminCreateManualTrade({
        taker_user_id: takerId,
        maker_user_id: makerId ?? undefined,
        market_id: manualMarketId,
        outcome_id: manualOutcomeId,
        side: manualSide,
        price,
        contract_size: contracts,
      });
      showToast('Manual trade created', 'success');
      setManualPrice('');
      setManualContracts('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create manual trade', 'error');
    } finally {
      setManualTradeBusy(false);
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
          <h2 className="text-base sm:text-lg font-bold mb-3">Cancel orders</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => setCancelAllConfirmOpen(true)}
              disabled={cancelAllBusy}
              className="px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {cancelAllBusy ? 'Canceling…' : 'Cancel all open orders (all users)'}
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm">or for user:</span>
            <select
              value={cancelUserId ?? ''}
              onChange={(e) => setCancelUserId(e.target.value ? Number(e.target.value) : null)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} (id: {u.id})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => cancelUserId != null && setCancelAllUserConfirmOpen(true)}
              disabled={cancelUserId == null || cancelUserBusy}
              className="px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {cancelUserBusy ? 'Canceling…' : 'Cancel all for this user'}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-3">Pause / resume trading by market</h2>
          {loadingMarkets ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading markets…</p>
          ) : (
            <ul className="space-y-2">
              {markets.map((m) => {
                const paused = (m.trading_paused ?? 0) === 1;
                const busy = pauseBusy[m.market_id];
                return (
                  <li
                    key={m.market_id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <span className="text-sm font-medium truncate">{m.short_name}</span>
                    <button
                      type="button"
                      onClick={() => handlePauseResume(m.market_id, !paused)}
                      disabled={busy}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md disabled:opacity-50 ${
                        paused
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-500 text-white hover:bg-gray-600'
                      }`}
                    >
                      {busy ? '…' : paused ? 'Resume' : 'Pause'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-3">Add manual trade</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Record a trade like normal matching: taker is the one who took (placed the crossing order); maker is whose order was hit. Side is the taker&apos;s side (bid = buy, ask = sell). Both positions are updated when maker is set.
          </p>
          <form onSubmit={handleManualTrade} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Taker (required)</label>
              <select
                value={manualTakerUserId === '' ? '' : manualTakerUserId}
                onChange={(e) => setManualTakerUserId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select taker</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} (id: {u.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maker (optional)</label>
              <select
                value={manualMakerUserId === '' || manualMakerUserId === 'none' ? '' : manualMakerUserId}
                onChange={(e) => setManualMakerUserId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">None (house / system)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} (id: {u.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Market</label>
              <select
                value={manualMarketId}
                onChange={(e) => {
                  setManualMarketId(e.target.value);
                  setManualOutcomeId('');
                }}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select market</option>
                {markets.map((m) => (
                  <option key={m.market_id} value={m.market_id}>
                    {m.short_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Outcome</label>
              <select
                value={manualOutcomeId}
                onChange={(e) => setManualOutcomeId(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select outcome</option>
                {outcomes.map((o) => (
                  <option key={o.outcome_id} value={o.outcome_id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taker side</label>
              <select
                value={manualSide}
                onChange={(e) => setManualSide(e.target.value as 'bid' | 'ask')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="bid">Bid (taker bought)</option>
                <option value="ask">Ask (taker sold)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (cents, 100–9900)</label>
              <input
                type="number"
                min={100}
                max={9900}
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract size</label>
              <input
                type="number"
                min={1}
                value={manualContracts}
                onChange={(e) => setManualContracts(e.target.value)}
                placeholder="e.g. 10"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={manualTradeBusy}
              className="px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {manualTradeBusy ? 'Creating…' : 'Add manual trade'}
            </button>
          </form>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={cancelAllConfirmOpen}
        onClose={() => setCancelAllConfirmOpen(false)}
        onConfirm={handleCancelAllOrders}
        title="Cancel all open orders"
        message="Cancel all open/partial orders for every user? This cannot be undone."
        confirmLabel="Cancel all"
        variant="danger"
      />
      <ConfirmModal
        isOpen={cancelAllUserConfirmOpen}
        onClose={() => {
          setCancelAllUserConfirmOpen(false);
          setCancelUserId(null);
        }}
        onConfirm={handleCancelAllOrdersForUser}
        title="Cancel all orders for this user"
        message={
          cancelUserId != null
            ? `Cancel all open/partial orders for user ${users.find((u) => u.id === cancelUserId)?.username ?? cancelUserId}?`
            : ''
        }
        confirmLabel="Cancel all"
        variant="danger"
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
