import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { ToastContainer, useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import type { Market } from '../types';

// Throttle admin data fetch: avoid duplicate requests in React Strict Mode or rapid re-mounts.
const ADMIN_FETCH_THROTTLE_MS = 3000;
let lastAdminFetchAt = 0;

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const hasFetchedRef = useRef(false);

  const [users, setUsers] = useState<Array<{ id: number; username: string }>>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [participants, setParticipants] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [cancelAllConfirmOpen, setCancelAllConfirmOpen] = useState(false);
  const [cancelAllUserConfirmOpen, setCancelAllUserConfirmOpen] = useState(false);
  const [cancelUserId, setCancelUserId] = useState<number | null>(null);
  const [cancelAllBusy, setCancelAllBusy] = useState(false);
  const [cancelUserBusy, setCancelUserBusy] = useState(false);
  const [pauseBusy, setPauseBusy] = useState<Record<string, boolean>>({});
  const [manualTradeBusy, setManualTradeBusy] = useState(false);
  const [replayPositionsBusy, setReplayPositionsBusy] = useState(false);

  // Manual trade form (taker = user who took; maker = user whose order was hit; side = taker's side)
  const [manualTakerUserId, setManualTakerUserId] = useState<number | ''>('');
  const [manualMakerUserId, setManualMakerUserId] = useState<number | ''>('');
  const [manualMarketId, setManualMarketId] = useState<string>('');
  const [manualOutcomeId, setManualOutcomeId] = useState<string>('');
  const [manualSide, setManualSide] = useState<'bid' | 'ask'>('bid');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualContracts, setManualContracts] = useState<string>('');

  // Auction (Round O/U or Pars e.g. Boose Pars)
  const [auctionType, setAuctionType] = useState<'round_ou' | 'pars'>('round_ou');
  const [auctionRound, setAuctionRound] = useState<number>(1);
  const [auctionParticipantId, setAuctionParticipantId] = useState<string>('');
  const [auctionParsMarketId, setAuctionParsMarketId] = useState<string>('');
  const [auctionParsOutcomeId, setAuctionParsOutcomeId] = useState<string>('');
  const [auctionBids, setAuctionBids] = useState<Array<{ user_id: number; guess: string }>>([
    { user_id: 0, guess: '' },
    { user_id: 0, guess: '' },
  ]);
  const [auctionBusy, setAuctionBusy] = useState(false);

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
    Promise.all([api.adminGetUsers(), api.getMarkets(), api.getParticipants()])
      .then(([usersRes, marketsRes, participantsRes]) => {
        if (cancelled) return;
        setUsers(usersRes.users ?? []);
        setMarkets(marketsRes.markets ?? []);
        setParticipants((participantsRes.participants ?? []).map((p: any) => ({ id: p.id ?? p.name, name: p.name })));
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

  function addAuctionBid() {
    setAuctionBids((prev) => [...prev, { user_id: 0, guess: '' }]);
  }

  function removeAuctionBid(index: number) {
    setAuctionBids((prev) => prev.filter((_, i) => i !== index));
  }

  function setAuctionBidAt(index: number, field: 'user_id' | 'guess', value: number | string) {
    setAuctionBids((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  async function handleRunAuction(e: React.FormEvent) {
    e.preventDefault();
    if (auctionBids.length < 2) {
      showToast('At least 2 bids are required', 'error');
      return;
    }
    const userIds = auctionBids.map((b) => b.user_id);
    const duplicate = userIds.some((id, i) => id !== 0 && userIds.indexOf(id) !== i);
    if (duplicate) {
      showToast('Duplicate user in bids; each user may only appear once', 'error');
      return;
    }
    const bids: Array<{ user_id: number; guess: number }> = [];
    for (let i = 0; i < auctionBids.length; i++) {
      const uid = auctionBids[i].user_id;
      const g = auctionBids[i].guess.trim() ? parseFloat(auctionBids[i].guess) : NaN;
      if (!uid || Number.isNaN(g)) {
        showToast(`Bid ${i + 1}: select user and enter a numeric guess`, 'error');
        return;
      }
      bids.push({ user_id: uid, guess: g });
    }
    if (auctionType === 'round_ou' && !auctionParticipantId) {
      showToast('Select a participant', 'error');
      return;
    }
    if (auctionType === 'pars' && !auctionParsMarketId) {
      showToast('Select a market', 'error');
      return;
    }
    setAuctionBusy(true);
    try {
      const res = await api.adminRunRoundOuAuction({
        auction_type: auctionType,
        ...(auctionType === 'round_ou' && { round: auctionRound }),
        ...(auctionType === 'round_ou' && { participant_id: auctionParticipantId }),
        ...(auctionType === 'pars' && auctionParsMarketId && { market_id: auctionParsMarketId }),
        ...(auctionType === 'pars' && auctionParsOutcomeId && { outcome_id: auctionParsOutcomeId }),
        bids,
      });
      showToast(`Auction done. Strike: ${res.strike}. ${res.trades_created} trade(s) created.`, 'success');
      navigate(`/markets/${res.market_id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to run auction', 'error');
    } finally {
      setAuctionBusy(false);
    }
  }

  async function runReplay(fullReset: boolean) {
    setReplayPositionsBusy(true);
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
      setReplayPositionsBusy(false);
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
          <h2 className="text-base sm:text-lg font-bold mb-3">Ensure portfolio values are zero-sum</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Portfolio value (unrealized P&amp;L) should sum to zero. <strong>Replay positions</strong> recomputes <code className="text-xs">net_position</code> and <code className="text-xs">price_basis</code> from trade history. <strong>Replay with full reset</strong> zeros all positions first, then replays (clean slate).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runReplay(false)}
              disabled={replayPositionsBusy}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {replayPositionsBusy ? 'Running…' : 'Replay positions'}
            </button>
            <button
              type="button"
              onClick={() => runReplay(true)}
              disabled={replayPositionsBusy}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Replay with full reset
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
                value={manualMakerUserId === '' ? '' : String(manualMakerUserId)}
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

      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-3">Auction</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {auctionType === 'round_ou'
              ? 'Round O/U: round (1–6), participant (golfer), and N bids (user + guess). Strike = average of guesses. Lowest half short, rest long; paired at 50¢.'
              : 'Pars (e.g. Boose Pars): participant (golfer), and N bids (user + guess = number of pars). Strike = average. Lowest half short, rest long; paired at 50¢.'}
          </p>
          <form onSubmit={handleRunAuction} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Market type</label>
              <select
                value={auctionType}
                onChange={(e) => setAuctionType(e.target.value as 'round_ou' | 'pars')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="round_ou">Round O/U</option>
                <option value="pars">Pars (e.g. Boose Pars)</option>
              </select>
            </div>
            {auctionType === 'round_ou' && (
              <div>
                <label className="block text-sm font-medium mb-1">Round</label>
                <select
                  value={auctionRound}
                  onChange={(e) => setAuctionRound(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      Round {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {auctionType === 'round_ou' && (
              <div>
                <label className="block text-sm font-medium mb-1">Participant</label>
                <select
                  value={auctionParticipantId}
                  onChange={(e) => setAuctionParticipantId(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Select participant</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {auctionType === 'pars' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Market</label>
                  <select
                    value={auctionParsMarketId}
                    onChange={(e) => {
                      setAuctionParsMarketId(e.target.value);
                      setAuctionParsOutcomeId('');
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Select market</option>
                    {markets.filter((m) => m.market_type === 'pars').map((m) => (
                      <option key={m.market_id} value={m.market_id}>
                        {m.short_name}
                      </option>
                    ))}
                  </select>
                </div>
                {auctionParsMarketId && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Outcome (line)</label>
                    <select
                      value={auctionParsOutcomeId}
                      onChange={(e) => setAuctionParsOutcomeId(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">New line (strike from bids)</option>
                      {(markets.find((m) => m.market_id === auctionParsMarketId)?.outcomes ?? []).map((o) => (
                        <option key={o.outcome_id} value={o.outcome_id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Bids (min 2)</label>
                <button
                  type="button"
                  onClick={addAuctionBid}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Add bid
                </button>
              </div>
              <div className="space-y-2">
                {auctionBids.map((row, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <select
                      value={row.user_id || ''}
                      onChange={(e) => setAuctionBidAt(index, 'user_id', Number(e.target.value) || 0)}
                      className="flex-1 min-w-[120px] border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">User</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={row.guess}
                      onChange={(e) => setAuctionBidAt(index, 'guess', e.target.value)}
                      placeholder={auctionType === 'pars' ? 'Pars' : 'Guess'}
                      className="w-20 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                    />
                    {auctionBids.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAuctionBid(index)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        aria-label="Remove bid"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={auctionBusy}
              className="px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {auctionBusy ? 'Running…' : 'Run auction'}
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
