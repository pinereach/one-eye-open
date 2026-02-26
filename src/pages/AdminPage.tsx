import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { MARKET_TYPE_ORDER, getMarketTypeLabel } from '../lib/marketTypes';
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
  const [refreshVolumeBusy, setRefreshVolumeBusy] = useState(false);

  // Manual trade form (taker = user who took; maker = user whose order was hit; side = taker's side)
  const [manualTakerUserId, setManualTakerUserId] = useState<number | ''>('');
  const [manualMakerUserId, setManualMakerUserId] = useState<number | ''>('');
  const [manualMarketId, setManualMarketId] = useState<string>('');
  const [manualOutcomeId, setManualOutcomeId] = useState<string>('');
  const [manualSide, setManualSide] = useState<'bid' | 'ask'>('bid');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualContracts, setManualContracts] = useState<string>('');

  // Auction: two types — (1) strike from average, 50¢ shares (Round O/U or Pars) or (2) outcome at average price
  const [auctionCategory, setAuctionCategory] = useState<'strike' | 'outcome'>('strike');
  const [auctionStrikeMode, setAuctionStrikeMode] = useState<'round_ou' | 'pars'>('round_ou');
  const [auctionRound, setAuctionRound] = useState<number>(1);
  const [auctionParticipantId, setAuctionParticipantId] = useState<string>('');
  const [auctionParsMarketId, setAuctionParsMarketId] = useState<string>('');
  const [auctionParsOutcomeId, setAuctionParsOutcomeId] = useState<string>('');
  const [auctionOutcomeMarketTypeFilter, setAuctionOutcomeMarketTypeFilter] = useState<string>('all');
  const [auctionOutcomeMarketId, setAuctionOutcomeMarketId] = useState<string>('');
  const [auctionOutcomeId, setAuctionOutcomeId] = useState<string>('');
  const [auctionBids, setAuctionBids] = useState<Array<{ user_id: number; guess: string }>>([
    { user_id: 0, guess: '' },
    { user_id: 0, guess: '' },
  ]);
  const [auctionBusy, setAuctionBusy] = useState(false);
  const [refreshMarketsBusy, setRefreshMarketsBusy] = useState(false);

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
    Promise.all([api.adminGetUsers(), api.getMarkets({ cacheBust: true }), api.getParticipants()])
      .then(([usersRes, marketsRes, participantsRes]) => {
        if (cancelled) return;
        const loadedUsers = usersRes.users ?? [];
        setUsers(loadedUsers);
        setMarkets(marketsRes.markets ?? []);
        setParticipants((participantsRes.participants ?? []).map((p: any) => ({ id: p.id ?? p.name, name: p.name })));
        // Initialize auction bids with all users (each user gets an empty guess)
        if (loadedUsers.length > 0) {
          setAuctionBids(loadedUsers.map((u: { id: number }) => ({ user_id: u.id, guess: '' })));
        }
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

  // Backend expects round_ou | pars | outcome; we have two UI categories: strike (→ round_ou or pars) and outcome
  const effectiveAuctionType = auctionCategory === 'strike' ? auctionStrikeMode : 'outcome';

  // Normalize market type (handle Total Birdies/Pars which may have market_type='other' but identifiable market_id)
  function normalizeMarketType(m: { market_id: string; market_type?: string | null }): string {
    let type = m.market_type || 'other';
    if (type === 'other' && (m.market_id === 'market-total-birdies' || m.market_id === 'market_total_birdies')) {
      type = 'market_total_birdies';
    }
    if (type === 'other' && (m.market_id === 'market-total-pars' || m.market_id === 'market_total_pars')) {
      type = 'market_total_pars';
    }
    return type;
  }

  // Auction "Any outcome": all market types present in markets, then filter markets by selected type
  const auctionOutcomeMarketTypeOptions = useMemo(() => {
    const types = new Set(markets.map((m) => normalizeMarketType(m)));
    const sorted = [...types].sort((a, b) => {
      const i = MARKET_TYPE_ORDER.indexOf(a);
      const j = MARKET_TYPE_ORDER.indexOf(b);
      return (i === -1 ? MARKET_TYPE_ORDER.length : i) - (j === -1 ? MARKET_TYPE_ORDER.length : j);
    });
    return [{ value: 'all', label: 'All' }, ...sorted.map((t) => ({ value: t, label: getMarketTypeLabel(t) }))];
  }, [markets]);

  const auctionOutcomeMarketsByType = useMemo(() => {
    if (auctionOutcomeMarketTypeFilter === 'all') return markets;
    return markets.filter((m) => normalizeMarketType(m) === auctionOutcomeMarketTypeFilter);
  }, [markets, auctionOutcomeMarketTypeFilter]);

  // When market type filter changes, clear market/outcome if current market no longer in list
  useEffect(() => {
    if (auctionCategory !== 'outcome') return;
    const stillValid = auctionOutcomeMarketsByType.some((m) => m.market_id === auctionOutcomeMarketId);
    if (!stillValid && auctionOutcomeMarketId) {
      setAuctionOutcomeMarketId('');
      setAuctionOutcomeId('');
    }
  }, [auctionCategory, auctionOutcomeMarketTypeFilter, auctionOutcomeMarketsByType, auctionOutcomeMarketId]);

  async function refreshMarkets() {
    setRefreshMarketsBusy(true);
    try {
      const res = await api.getMarkets({ cacheBust: true });
      setMarkets(res.markets ?? []);
      showToast(`Markets refreshed (${(res.markets ?? []).length} total)`, 'success');
    } catch {
      showToast('Failed to refresh markets', 'error');
    } finally {
      setRefreshMarketsBusy(false);
    }
  }

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
    // Find first user not already in the auction
    const existingUserIds = new Set(auctionBids.map((b) => b.user_id));
    const nextUser = users.find((u) => !existingUserIds.has(u.id));
    if (nextUser) {
      setAuctionBids((prev) => [...prev, { user_id: nextUser.id, guess: '' }]);
    } else {
      showToast('All users are already in the auction', 'info');
    }
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
    if (effectiveAuctionType === 'round_ou' && !auctionParticipantId) {
      showToast('Select a participant', 'error');
      return;
    }
    if (effectiveAuctionType === 'outcome' && !auctionOutcomeId) {
      showToast('Select an outcome', 'error');
      return;
    }
    let parsMarketId = '';
    if (effectiveAuctionType === 'pars') {
      if (auctionParsOutcomeId && auctionParsOutcomeId !== '__new__') {
        const parsMarkets = markets.filter((m) => m.market_type === 'pars' || (m.short_name && m.short_name.toLowerCase().includes('pars')));
        for (const m of parsMarkets) {
          const o = (m.outcomes ?? []).find((out: { outcome_id: string }) => out.outcome_id === auctionParsOutcomeId);
          if (o) {
            parsMarketId = m.market_id;
            break;
          }
        }
        if (!parsMarketId) {
          showToast('Selected line not found', 'error');
          return;
        }
      } else if (auctionParsOutcomeId === '__new__' && auctionParsMarketId) {
        parsMarketId = auctionParsMarketId;
      } else {
        showToast('Select a line or choose New line and a market', 'error');
        return;
      }
    }
    setAuctionBusy(true);
    try {
      const res = await api.adminRunRoundOuAuction({
        auction_type: effectiveAuctionType,
        ...(effectiveAuctionType === 'round_ou' && { round: auctionRound }),
        ...(effectiveAuctionType === 'round_ou' && { participant_id: auctionParticipantId }),
        ...(effectiveAuctionType === 'pars' && parsMarketId && { market_id: parsMarketId }),
        ...(effectiveAuctionType === 'pars' && auctionParsOutcomeId && auctionParsOutcomeId !== '__new__' && { outcome_id: auctionParsOutcomeId }),
        ...(effectiveAuctionType === 'outcome' && { outcome_id: auctionOutcomeId }),
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

  async function handleRefreshVolume() {
    setRefreshVolumeBusy(true);
    try {
      const res = await api.adminRefreshVolume();
      showToast(`Volume cache updated for ${res?.updated ?? 0} market(s)`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to refresh volume', 'error');
    } finally {
      setRefreshVolumeBusy(false);
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
          <h2 className="text-base sm:text-lg font-bold mb-3">Volume cache</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Recompute 30-day volume per market so list and detail pages show correct volume. Also runs automatically every 4 hours via cron.
          </p>
          <button
            type="button"
            onClick={handleRefreshVolume}
            disabled={refreshVolumeBusy}
            className="px-3 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {refreshVolumeBusy ? 'Refreshing…' : 'Refresh volume'}
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-base sm:text-lg font-bold mb-3">Ensure portfolio values are zero-sum</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Portfolio value (unrealized P&amp;L) should sum to zero. <strong>Replay positions</strong> recomputes <code className="text-xs">net_position</code> and <code className="text-xs">price_basis</code> from trade history. <strong>Replay with full reset</strong> deletes all position rows, then replays so positions are re-created only from the trade log (clean slate).
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
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold">Auction</h2>
            <button
              type="button"
              onClick={refreshMarkets}
              disabled={refreshMarketsBusy || loadingMarkets}
              className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {refreshMarketsBusy ? 'Refreshing…' : 'Refresh markets'}
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {auctionCategory === 'strike'
              ? 'Strike from average: enter bids (guess or %). Strike = average; lowest half get short, rest long, all at 50¢.'
              : 'Outcome: select market and outcome. Enter each bid as %. Trade price = average of bids; lowest half short, rest long.'}
          </p>
          <form onSubmit={handleRunAuction} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Auction type</label>
              <select
                value={auctionCategory}
                onChange={(e) => {
                  const v = e.target.value as 'strike' | 'outcome';
                  setAuctionCategory(v);
                  if (v === 'outcome') {
                    setAuctionOutcomeMarketId('');
                    setAuctionOutcomeId('');
                  }
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="strike">Strike from average (50¢)</option>
                <option value="outcome">Outcome (average price)</option>
              </select>
            </div>
            {auctionCategory === 'strike' && (
              <div>
                <label className="block text-sm font-medium mb-1">Strike type</label>
                <select
                  value={auctionStrikeMode}
                  onChange={(e) => setAuctionStrikeMode(e.target.value as 'round_ou' | 'pars')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="round_ou">Round O/U</option>
                  <option value="pars">Pars</option>
                </select>
              </div>
            )}
            {effectiveAuctionType === 'round_ou' && (
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
            {effectiveAuctionType === 'round_ou' && (
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
            {auctionCategory === 'outcome' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Market type</label>
                  <select
                    value={auctionOutcomeMarketTypeFilter}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAuctionOutcomeMarketTypeFilter(v);
                      const nextMarkets = v === 'all' ? markets : markets.filter((m) => (m.market_type ?? 'other') === v);
                      const stillValid = nextMarkets.some((m) => m.market_id === auctionOutcomeMarketId);
                      if (!stillValid) {
                        setAuctionOutcomeMarketId('');
                        setAuctionOutcomeId('');
                      }
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                  >
                    {auctionOutcomeMarketTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Market</label>
                  <select
                    value={auctionOutcomeMarketId}
                    onChange={(e) => {
                      setAuctionOutcomeMarketId(e.target.value);
                      setAuctionOutcomeId('');
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Select market</option>
                    {auctionOutcomeMarketsByType.map((m) => (
                      <option key={m.market_id} value={m.market_id}>
                        {m.short_name ?? m.market_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Outcome</label>
                  <select
                    value={auctionOutcomeId}
                    onChange={(e) => setAuctionOutcomeId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Select outcome</option>
                    {(markets.find((m) => m.market_id === auctionOutcomeMarketId)?.outcomes ?? []).map((o: { outcome_id: string; name?: string }) => (
                      <option key={o.outcome_id} value={o.outcome_id}>
                        {o.name ?? o.outcome_id}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {effectiveAuctionType === 'pars' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Line</label>
                  <select
                    value={auctionParsOutcomeId || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAuctionParsOutcomeId(v);
                      if (!v) setAuctionParsMarketId('');
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Select line</option>
                    {(
                      markets.filter(
                        (m) => m.market_type === 'pars' || (m.short_name && m.short_name.toLowerCase().includes('pars'))
                      ) as Array<{ market_id: string; short_name: string; outcomes?: Array<{ outcome_id: string; strike?: string; name?: string }> }>
                    ).flatMap((m) =>
                      (m.outcomes ?? []).map((o) => ({
                        outcome_id: o.outcome_id,
                        market_id: m.market_id,
                        label: o.strike != null && o.strike !== '' ? `O${o.strike}` : o.name ?? o.outcome_id,
                      }))
                    ).map((opt) => (
                      <option key={opt.outcome_id} value={opt.outcome_id}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__new__">— New line (strike from bid average) —</option>
                  </select>
                </div>
                {effectiveAuctionType === 'pars' && auctionParsOutcomeId === '__new__' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Market (for new line)</label>
                    <select
                      value={auctionParsMarketId}
                      onChange={(e) => setAuctionParsMarketId(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">Select market</option>
                      {markets
                        .filter(
                          (m) => m.market_type === 'pars' || (m.short_name && m.short_name.toLowerCase().includes('pars'))
                        )
                        .map((m) => (
                          <option key={m.market_id} value={m.market_id}>
                            {m.short_name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Participants (min 2, remove those not in)</label>
                <button
                  type="button"
                  onClick={addAuctionBid}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {auctionBids.map((row, index) => {
                  const bidUser = users.find((u) => u.id === row.user_id);
                  return (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 min-w-[120px] text-sm font-medium text-gray-900 dark:text-gray-100">
                      {bidUser?.username ?? `User ${row.user_id}`}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min={effectiveAuctionType === 'pars' || effectiveAuctionType === 'outcome' ? 0 : undefined}
                      max={effectiveAuctionType === 'pars' || effectiveAuctionType === 'outcome' ? 100 : undefined}
                      value={row.guess}
                      onChange={(e) => setAuctionBidAt(index, 'guess', e.target.value)}
                      placeholder={effectiveAuctionType === 'pars' || effectiveAuctionType === 'outcome' ? 'Bid %' : 'Guess'}
                      className="w-20 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-sm"
                    />
                    {auctionBids.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAuctionBid(index)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        aria-label="Remove participant"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  );
                })}
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
