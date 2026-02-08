import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatPrice, formatPriceBasis, formatPriceDecimal, formatPriceCents, formatNotionalBySide } from '../../lib/format';
import { Orderbook } from './Orderbook';
import { ToastContainer, useToast } from '../ui/Toast';
import { BottomSheet } from '../ui/BottomSheet';
import { Tabs } from '../ui/Tabs';
import { ConfirmModal } from '../ui/ConfirmModal';
import { PullToRefresh } from '../ui/PullToRefresh';
import { Skeleton } from '../ui/Skeleton';
import { Card, CardContent } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import type { Market, Order, Trade, Position, Outcome } from '../../types';
import { format } from 'date-fns';

export function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const { user } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [orderbookByOutcome, setOrderbookByOutcome] = useState<Record<string, { bids: Order[]; asks: Order[] }>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSide, setOrderSide] = useState<'bid' | 'ask' | 'market_maker'>('bid');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [mmBidPrice, setMmBidPrice] = useState('');
  const [mmAskPrice, setMmAskPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState<'price' | null>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [showOrderbookInForm, setShowOrderbookInForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'outcomes' | 'orders' | 'trades' | 'positions'>('outcomes');
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [cancelingAll, setCancelingAll] = useState(false);
  const [confirmCancelOrderId, setConfirmCancelOrderId] = useState<number | null>(null);
  const [confirmCancelAllOpen, setConfirmCancelAllOpen] = useState(false);
  const [confirmCancelAllForOutcome, setConfirmCancelAllForOutcome] = useState(false);
  const [cancelingAllForOutcome, setCancelingAllForOutcome] = useState(false);
  const [handicaps, setHandicaps] = useState<Record<string, number>>({});
  const [currentScores, setCurrentScores] = useState<Record<string, { score_gross: number | null; score_net: number | null; number_birdies: number | null }>>({});
  const [lastTradePriceByOutcomeFromApi, setLastTradePriceByOutcomeFromApi] = useState<Record<string, number>>({});
  const [volatilityByPlayer, setVolatilityByPlayer] = useState<Record<string, { year: number; volatility: number }>>({});
  const isDesktop = useIsDesktop();
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const lastLoadTsRef = useRef<number>(0);

  const MIN_REFRESH_INTERVAL_MS = 120_000; // 2 min — reduce D1 reads from visibility/sheet refetches

  /** Apply a single fill to position state (mirrors backend updatePosition logic). */
  function applyFillToPosition(
    current: { net_position: number; price_basis: number } | null,
    side: 'bid' | 'ask',
    priceCents: number,
    qtyContracts: number
  ): { net_position: number; price_basis: number } {
    const curNet = current?.net_position ?? 0;
    const curBasis = current?.price_basis ?? 0;
    const PRICE_MIN = 100;
    const PRICE_MAX = 9900;
    let newNet = curNet;
    let newBasis = curBasis;
    if (side === 'bid') {
      if (curNet < 0) {
        const closeQty = Math.min(qtyContracts, Math.abs(curNet));
        const remaining = qtyContracts - closeQty;
        newNet = curNet + closeQty;
        if (remaining > 0) {
          newNet += remaining;
          newBasis = priceCents;
        } else if (newNet === 0) newBasis = 0;
      } else {
        newNet = curNet + qtyContracts;
        newBasis = curNet > 0 && curBasis > 0
          ? Math.round((curNet * curBasis + qtyContracts * priceCents) / newNet)
          : priceCents;
      }
    } else {
      if (curNet > 0) {
        const closeQty = Math.min(qtyContracts, curNet);
        const remaining = qtyContracts - closeQty;
        newNet = curNet - closeQty;
        if (remaining > 0) {
          newNet -= remaining;
          newBasis = priceCents;
        } else if (newNet === 0) newBasis = 0;
      } else {
        newNet = curNet - qtyContracts;
        newBasis = curNet < 0 && curBasis > 0
          ? Math.round((Math.abs(curNet) * curBasis + qtyContracts * priceCents) / Math.abs(newNet))
          : priceCents;
      }
    }
    if (newNet !== 0 && newBasis > 0) {
      newBasis = Math.max(PRICE_MIN, Math.min(PRICE_MAX, newBasis));
    }
    return { net_position: newNet, price_basis: newBasis };
  }

  /** H2H outcome name is "PlayerA Over PlayerB"; format with handicap indexes in smaller font. */
  function formatH2HOutcomeWithIndexes(name: string, asString: false): React.ReactNode;
  function formatH2HOutcomeWithIndexes(name: string, asString: true): string;
  function formatH2HOutcomeWithIndexes(name: string, asString: boolean): React.ReactNode | string {
    const overIdx = name.indexOf(' Over ');
    if (overIdx === -1) return asString ? name : <>{name}</>;
    const playerA = name.slice(0, overIdx).trim();
    const playerB = name.slice(overIdx + 6).trim();
    const indexA = handicaps[playerA];
    const indexB = handicaps[playerB];
    const small = (x: number) => <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal"> ({x})</span>;
    if (asString) return `${playerA}${indexA != null ? ` (${indexA})` : ''} Over ${playerB}${indexB != null ? ` (${indexB})` : ''}`;
    return <>{playerA}{indexA != null && small(indexA)} Over {playerB}{indexB != null && small(indexB)}</>;
  }

  useEffect(() => {
    if (id) loadMarket();
  }, [id]);

  // Reset market maker selection if user loses view_market_maker
  useEffect(() => {
    if (user && !user.view_market_maker && orderSide === 'market_maker') {
      setOrderSide('bid');
    }
  }, [user?.view_market_maker, orderSide]);

  // Auto-focus quantity input when order window opens
  useEffect(() => {
    if (bottomSheetOpen && quantityInputRef.current) {
      // Small delay to ensure the bottom sheet is fully rendered
      setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 100);
    }
  }, [bottomSheetOpen]);

  // Refetch when opening order sheet if data is stale (throttled)
  useEffect(() => {
    if (bottomSheetOpen && id && Date.now() - lastLoadTsRef.current >= MIN_REFRESH_INTERVAL_MS) {
      loadMarket();
    }
  }, [bottomSheetOpen, id]);

  // Refetch when user returns to tab if data is stale (throttled)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && id && Date.now() - lastLoadTsRef.current >= MIN_REFRESH_INTERVAL_MS) {
        loadMarket();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [id]);

  async function loadMarket(forceRefresh = false) {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getMarket(id, forceRefresh ? { cacheBust: true } : undefined);
      setMarket(data?.market || null);
      setOutcomes(data?.outcomes || []);
      setOrderbookByOutcome(data?.orderbook || {});
      setTrades(data?.trades ?? []);
      setPositions(data?.positions ?? []);
      setLastTradePriceByOutcomeFromApi((data as { lastTradePriceByOutcome?: Record<string, number> })?.lastTradePriceByOutcome ?? {});

      // Load handicaps for individual-net-champion and H2H matchups (cached 48h). Use 2025 if 2026 has no data yet.
      const needsHandicaps = data?.market?.market_id === 'market-individual-net-champion' || data?.market?.market_id === 'market-h2h-matchups';
      if (needsHandicaps) {
        api.getHandicaps(2026).then((res) => {
          const h = ('handicaps' in res ? res.handicaps : {}) ?? {};
          if (Object.keys(h).length > 0) {
            setHandicaps(h);
          } else {
            api.getHandicaps(2025).then((r) => setHandicaps(('handicaps' in r ? r.handicaps : {}) ?? {})).catch(() => setHandicaps({}));
          }
        }).catch(() => setHandicaps({}));
      } else {
        setHandicaps({});
      }

      // Load current scores (to par gross/net) for gross and net champion markets
      const needsCurrentScores = data?.market?.market_id === 'market-individual-gross-champion' || data?.market?.market_id === 'market-individual-net-champion';
      if (needsCurrentScores) {
        api.getCurrentScores().then((res: { scores?: Array<{ name: string; score_gross: number | null; score_net: number | null; number_birdies: number | null }> }) => {
          const map: Record<string, { score_gross: number | null; score_net: number | null; number_birdies: number | null }> = {};
          for (const s of res.scores ?? []) {
            map[s.name] = { score_gross: s.score_gross, score_net: s.score_net, number_birdies: s.number_birdies };
          }
          setCurrentScores(map);
        }).catch(() => setCurrentScores({}));
      } else {
        setCurrentScores({});
      }

      // Load player score volatility (year of highest volatility per player) for Player Score Volatility market. Cached 7 days.
      const isVolatilityMarket = data?.market?.market_id?.includes('volatility') || (data?.market?.short_name && data.market.short_name.toLowerCase().includes('volatility'));
      if (isVolatilityMarket) {
        api.getPlayerVolatility().then((res: { volatilityByPlayer?: Record<string, { year: number; volatility: number }> }) => {
          setVolatilityByPlayer(res?.volatilityByPlayer ?? {});
        }).catch(() => setVolatilityByPlayer({}));
      } else {
        setVolatilityByPlayer({});
      }

      // Sort outcomes by chance and select the highest chance outcome (Total Strokes keeps original order)
      if (data.outcomes && data.outcomes.length > 0 && data.orderbook) {
        const isTotalStrokes = data.market?.market_id === 'market-total-strokes';
        const ordered = isTotalStrokes
          ? [...data.outcomes]
          : [...data.outcomes].sort((a, b) => {
              const orderbookA = data.orderbook[a.outcome_id];
              const orderbookB = data.orderbook[b.outcome_id];
              const bestBidA = orderbookA?.bids?.[0];
              const bestAskA = orderbookA?.asks?.[0];
              const bestBidB = orderbookB?.bids?.[0];
              const bestAskB = orderbookB?.asks?.[0];
              const avgPriceA = bestBidA && bestAskA ? (bestBidA.price + bestAskA.price) / 2 : (bestBidA?.price || 0);
              const avgPriceB = bestBidB && bestAskB ? (bestBidB.price + bestAskB.price) / 2 : (bestBidB?.price || 0);
              return avgPriceB - avgPriceA; // Descending
            });

        if (!selectedOutcomeId && ordered.length > 0) {
          setSelectedOutcomeId(ordered[0].outcome_id);
        }
      }
    } catch (err) {
      console.error('Failed to load market:', err);
      showToast('Failed to load market data', 'error');
    } finally {
      setLoading(false);
      lastLoadTsRef.current = Date.now();
    }
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !selectedOutcomeId) {
      showToast('Please select an outcome', 'error');
      return;
    }

    const qty = parseInt(orderQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Quantity must be at least 1', 'error');
      return;
    }

    // Market maker: place bid and ask (same outcome, same qty)
    if (orderSide === 'market_maker') {
      const bidPrice = parseInt(mmBidPrice, 10);
      const askPrice = parseInt(mmAskPrice, 10);
      if (isNaN(bidPrice) || bidPrice < 1 || bidPrice > 99) {
        showToast('Bid price must be a whole number between $1 and $99', 'error');
        return;
      }
      if (isNaN(askPrice) || askPrice < 1 || askPrice > 99) {
        showToast('Ask price must be a whole number between $1 and $99', 'error');
        return;
      }
      if (bidPrice >= askPrice) {
        showToast('Bid price must be less than ask price', 'error');
        return;
      }
      setSubmitting(true);
      try {
        await api.placeOrder(id, {
          outcome_id: selectedOutcomeId,
          side: 'bid',
          price: bidPrice * 100,
          contract_size: qty,
          tif: 'GTC',
        });
        await api.placeOrder(id, {
          outcome_id: selectedOutcomeId,
          side: 'ask',
          price: askPrice * 100,
          contract_size: qty,
          tif: 'GTC',
        });
        setOrderQty('');
        setMmBidPrice('');
        setMmAskPrice('');
        showToast('Bid and ask placed', 'success');
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadMarket(true);
        setBottomSheetOpen(false);
      } catch (err: any) {
        showToast(err?.message || 'Failed to place orders', 'error');
        await loadMarket(true);
        showToast('Orderbook refreshed – please try again if needed.', 'info');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Single order (bid or ask)
    const price = parseInt(orderPrice, 10);
    if (isNaN(price) || price < 1 || price > 99) {
      showToast('Price must be a whole number between $1 and $99', 'error');
      return;
    }

    // Check if this order would match against user's own orders
    const priceCents = price * 100;
    const orderbook = selectedOutcomeId ? (orderbookByOutcome?.[selectedOutcomeId] || null) : null;
    if (orderbook && user?.id) {
      if (orderSide === 'bid') {
        // Check if user has any asks at or below this bid price
        const userAsks = orderbook.asks.filter(
          ask => ask.user_id === user.id && 
          (ask.status === 'open' || ask.status === 'partial') &&
          ask.price <= priceCents
        );
        if (userAsks.length > 0) {
          showToast('Cannot place bid: You have existing sell orders at this price or better', 'error');
          return;
        }
      } else {
        // Check if user has any bids at or above this ask price
        const userBids = orderbook.bids.filter(
          bid => bid.user_id === user.id && 
          (bid.status === 'open' || bid.status === 'partial') &&
          bid.price >= priceCents
        );
        if (userBids.length > 0) {
          showToast('Cannot place ask: You have existing buy orders at this price or better', 'error');
          return;
        }
      }
    }

    // Pre-submit refetch removed to reduce D1 reads; server validates order and orderbook on submit.
    setSubmitting(true);
    try {
      const res = await api.placeOrder(id, {
        outcome_id: selectedOutcomeId,
        side: orderSide,
        price: priceCents, // Already converted to cents
        contract_size: qty,
        tif: 'GTC',
      });
      setOrderPrice('');
      setOrderQty('');
      setAutoFilled(null);
      showToast('Order placed successfully!', 'success');

      // Immediate optimistic updates: orderbook, positions, trades
      const apiOrder = res?.order;
      const fills = res?.fills ?? [];
      const newTrades = res?.trades ?? [];
      const outcomeId = selectedOutcomeId;
      const uid = user?.id;

      if (apiOrder && outcomeId && uid != null) {
        const orderIdNum = typeof apiOrder.id === 'string' ? parseInt(apiOrder.id, 10) : apiOrder.id;
        const price = apiOrder.price_cents ?? apiOrder.price ?? priceCents;
        const remaining = apiOrder.qty_remaining ?? apiOrder.contract_size ?? apiOrder.qty_contracts ?? qty;
        const status = (apiOrder.status ?? 'open') as Order['status'];
        const sideNum = apiOrder.side === 'ask' ? 1 : 0;
        const frontendOrder: Order = {
          id: orderIdNum,
          create_time: apiOrder.created_at ?? Math.floor(Date.now() / 1000),
          user_id: uid,
          token: '',
          order_id: orderIdNum,
          outcome: outcomeId,
          price,
          status,
          tif: 'GTC',
          side: sideNum,
          contract_size: remaining,
          remaining_size: remaining,
        };

        setOrderbookByOutcome((prev) => {
          const next = { ...prev };
          const ob = next[outcomeId] ?? { bids: [], asks: [] };
          const bids = [...(ob.bids ?? [])];
          const asks = [...(ob.asks ?? [])];

          // Apply fills: reduce maker orders' size (or remove if 0)
          const makerSide = sideNum === 0 ? asks : bids;
          for (const fill of fills) {
            const makerId = typeof fill.maker_order_id === 'string' ? parseInt(fill.maker_order_id, 10) : fill.maker_order_id;
            const qty = fill.qty_contracts ?? fill.qty ?? 0;
            const idx = makerSide.findIndex((o) => o.id === makerId);
            if (idx >= 0) {
              const prevSize = makerSide[idx].remaining_size ?? makerSide[idx].contract_size ?? 0;
              const size = prevSize - qty;
              if (size <= 0) makerSide.splice(idx, 1);
              else makerSide.splice(idx, 1, { ...makerSide[idx], contract_size: size, remaining_size: size, status: 'partial' });
            }
          }

          // Add our new order if still open/partial
          if (status === 'open' || status === 'partial') {
            const list = sideNum === 0 ? bids : asks;
            const insertIdx = sideNum === 0
              ? list.findIndex((o) => o.price < price || (o.price === price && o.create_time > frontendOrder.create_time))
              : list.findIndex((o) => o.price > price || (o.price === price && o.create_time > frontendOrder.create_time));
            if (insertIdx === -1) list.push(frontendOrder);
            else list.splice(insertIdx, 0, frontendOrder);
          }

          next[outcomeId] = { bids, asks };
          return next;
        });
      }

      // Optimistic position update from new trades (we are taker)
      if (newTrades.length > 0 && outcomeId && uid != null) {
        let posState: { net_position: number; price_basis: number } | null = null;
        const existing = (positions ?? []).find((p) => p.outcome === outcomeId);
        if (existing) posState = { net_position: existing.net_position, price_basis: existing.price_basis };
        for (const t of newTrades) {
          const priceCents = t.price_cents ?? t.price ?? 0;
          const qty = t.qty_contracts ?? t.contracts ?? 0;
          posState = applyFillToPosition(posState, orderSide, priceCents, qty);
        }
        if (posState != null) {
          setPositions((prev) => {
            const idx = prev.findIndex((p) => p.outcome === outcomeId);
            const base = existing ?? {
              id: 0,
              user_id: uid,
              outcome: outcomeId,
              create_time: Math.floor(Date.now() / 1000),
              closed_profit: 0,
              settled_profit: 0,
              net_position: 0,
              price_basis: 0,
              is_settled: 0,
              market_name: market?.short_name,
              outcome_name: outcomes?.find((o) => o.outcome_id === outcomeId)?.name,
              outcome_ticker: outcomes?.find((o) => o.outcome_id === outcomeId)?.ticker,
            };
            const next = [...prev];
            const updated: Position = { ...base, ...posState };
            if (idx >= 0) next.splice(idx, 1, updated);
            else next.push(updated);
            return next;
          });
        }
      }

      // Prepend new trades to tape (map API shape to frontend Trade)
      if (newTrades.length > 0 && outcomeId) {
        const outcomeName = outcomes?.find((o) => o.outcome_id === outcomeId);
        const mapped: Trade[] = newTrades.map((t: any) => ({
          id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
          token: t.token ?? '',
          price: t.price_cents ?? t.price ?? 0,
          contracts: t.qty_contracts ?? t.contracts ?? 0,
          create_time: t.created_at ?? t.create_time ?? Math.floor(Date.now() / 1000),
          risk_off_contracts: 0,
          risk_off_price_diff: 0,
          outcome: outcomeId,
          outcome_name: outcomeName?.name ?? null,
          outcome_ticker: outcomeName?.ticker ?? null,
          side: orderSide === 'bid' ? 0 : 1,
          taker_side: orderSide === 'bid' ? 0 : 1,
        }));
        setTrades((prev) => [...mapped, ...(prev ?? [])]);
      }

      // Refresh in background to reconcile with server
      loadMarket(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'error');
      loadMarket(true);
      showToast('Orderbook refreshed – please try again if needed.', 'info');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBidClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('bid'); // Clicking Yes/Buy column → prepopulate Yes/Buy (bid)
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
    // Open bottom sheet for order form
    setBottomSheetOpen(true);
  }

  function handleAskClick(outcomeId: string, price: number | null) {
    setSelectedOutcomeId(outcomeId);
    setOrderSide('ask'); // Clicking No/Sell column → prepopulate No/Sell (ask)
    if (price) {
      const priceDollars = Math.round(price / 100);
      // Clamp to 1-99 range
      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
      setOrderPrice(clampedPrice.toString());
      setAutoFilled('price');
      setTimeout(() => setAutoFilled(null), 2000);
    }
    // Open bottom sheet for order form
    setBottomSheetOpen(true);
  }

  function handleSideChange(newSide: 'bid' | 'ask' | 'market_maker') {
    setOrderSide(newSide);
    // Auto-update price based on selected side
    if (selectedOrderbook) {
      if (newSide === 'bid' && bestBid) {
        const priceDollars = Math.round(bestBid.price / 100);
        const clampedPrice = Math.max(1, Math.min(99, priceDollars));
        setOrderPrice(clampedPrice.toString());
      } else if (newSide === 'ask' && bestAsk) {
        const priceDollars = Math.round(bestAsk.price / 100);
        const clampedPrice = Math.max(1, Math.min(99, priceDollars));
        setOrderPrice(clampedPrice.toString());
      } else if (newSide === 'market_maker' && (bestBid || bestAsk)) {
        if (bestBid) {
          const bidDollars = Math.max(1, Math.min(99, Math.round(bestBid.price / 100)));
          setMmBidPrice(bidDollars.toString());
        }
        if (bestAsk) {
          const askDollars = Math.max(1, Math.min(99, Math.round(bestAsk.price / 100)));
          setMmAskPrice(askDollars.toString());
        }
      }
    }
  }

  // Volume = number of contracts traded × $100
  const marketStats = (() => {
    const volume_contracts = (trades || []).reduce(
      (sum, t) => sum + (t.contracts || 0),
      0
    );
    const volume_dollars = volume_contracts * 100;
    return {
      volume_contracts,
      volume_dollars,
    };
  })();

  // Calculate order summary
  const orderSummary = (() => {
    const price = parseInt(orderPrice, 10) || 0;
    const qty = parseInt(orderQty, 10) || 0;
    const mmBid = parseInt(mmBidPrice, 10) || 0;
    const mmAsk = parseInt(mmAskPrice, 10) || 0;
    // For buy (Yes/bid side): cost = price * quantity
    // For sell (No/ask side): cost = quantity * (100 - price)
    const totalCost = orderSide === 'market_maker'
      ? 0
      : orderSide === 'bid'
        ? price * qty
        : qty * (100 - price);
    return {
      totalCost,
      price,
      qty,
      mmBidPrice: mmBid,
      mmAskPrice: mmAsk,
    };
  })();

  // Get selected outcome data
  const selectedOrderbook = selectedOutcomeId ? (orderbookByOutcome?.[selectedOutcomeId] || null) : null;
  const bestBid = selectedOrderbook?.bids?.[0];
  const bestAsk = selectedOrderbook?.asks?.[0];

  // Last traded price per outcome: prefer API (all market trades), else derive from current user's trades
  const lastTradePriceByOutcome = useMemo(() => {
    const fromApi = lastTradePriceByOutcomeFromApi;
    if (Object.keys(fromApi).length > 0) return fromApi;
    const byOutcome: Record<string, number> = {};
    const sorted = [...trades].sort((a, b) => b.create_time - a.create_time);
    for (const t of sorted) {
      const oid = (t as Trade & { outcome?: string | null }).outcome ?? '';
      if (oid && byOutcome[oid] === undefined) byOutcome[oid] = t.price;
    }
    return byOutcome;
  }, [trades, lastTradePriceByOutcomeFromApi]);

  const selectedOutcomeName = outcomes.find(o => o.outcome_id === selectedOutcomeId)?.name ?? '';
  const lastPriceSelected = selectedOutcomeId ? lastTradePriceByOutcome[selectedOutcomeId] : undefined;

  // Resolve position display names (API may not return market_name/outcome_name for market-scoped positions)
  function getPositionDisplayNames(position: Position) {
    const marketName = position.market_name ?? market?.short_name ?? 'N/A';
    const outcomeMatch = outcomes?.find(o => o.outcome_id === position.outcome);
    const outcomeLabel = position.outcome_ticker ?? position.outcome_name ?? outcomeMatch?.name ?? outcomeMatch?.ticker ?? position.outcome;
    return { marketName, outcomeLabel };
  }

  // Map outcome_id -> position for current user (to show "±N @ $X.X" or closed profit below outcome name)
  const positionByOutcome = (positions || []).reduce<Record<string, { net_position: number; price_basis: number; closed_profit?: number; settled_profit?: number }>>((acc, p) => {
    acc[p.outcome] = {
      net_position: p.net_position,
      price_basis: p.price_basis,
      closed_profit: p.closed_profit,
      settled_profit: p.settled_profit,
    };
    return acc;
  }, {});

  // Show cards for open positions or closed/settled positions with non-zero profit
  const positionsToShow = useMemo(
    () => (positions || []).filter(
      (p) => p.net_position !== 0 || (p.closed_profit ?? 0) !== 0 || (p.settled_profit ?? 0) !== 0
    ),
    [positions]
  );

  const formatPositionChip = (netPosition: number, priceBasisCents: number) => {
    const sign = netPosition >= 0 ? '+' : '';
    return `${sign}${netPosition} @ ${formatPriceBasis(priceBasisCents)}`;
  };

  const formatScoreToPar = (score: number | null | undefined): string => {
    if (score == null) return '—';
    if (score === 0) return 'E';
    return score > 0 ? `+${score}` : String(score);
  };

  const showCurrentColumn = market?.market_id === 'market-individual-gross-champion' || market?.market_id === 'market-individual-net-champion';
  const isVolatilityMarket = market?.market_id?.includes('volatility') || (market?.short_name && market.short_name.toLowerCase().includes('volatility'));

  // Total Strokes market: expected strokes = sum(midpoint * probability) per outcome (probability from orderbook mid or last trade)
  const TOTAL_STROKES_MIDPOINTS: Record<string, number> = {
    'outcome-total-strokes-lt-6499': 6500,
    'outcome-total-strokes-6500-6599': 6550,
    'outcome-total-strokes-6600-6699': 6650,
    'outcome-total-strokes-6700-6799': 6750,
    'outcome-total-strokes-6800-6899': 6850,
    'outcome-total-strokes-gt-6900': 6000,
  };
  const totalStrokesForecast = useMemo(() => {
    if (market?.market_id !== 'market-total-strokes' || !outcomes?.length) return null;
    let weightedSum = 0;
    let totalProb = 0;
    for (const o of outcomes) {
      const midpoint = TOTAL_STROKES_MIDPOINTS[o.outcome_id];
      if (midpoint == null) continue;
      const orderbook = orderbookByOutcome?.[o.outcome_id];
      const bestBid = orderbook?.bids?.[0];
      const bestAsk = orderbook?.asks?.[0];
      const midPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : (bestBid?.price ?? lastTradePriceByOutcome[o.outcome_id] ?? 0);
      if (midPrice <= 0) continue;
      const prob = midPrice / 10000;
      weightedSum += midpoint * prob;
      totalProb += prob;
    }
    if (totalProb <= 0) return null;
    return Math.round(weightedSum / totalProb);
  }, [market?.market_id, outcomes, orderbookByOutcome, lastTradePriceByOutcome]);

  const getPositionValueCents = (position: Position, currentPrice: number | null) => {
    if (currentPrice === null) return null;
    if (position.net_position < 0) {
      return (10000 - currentPrice) * Math.abs(position.net_position);
    }
    return position.net_position * currentPrice;
  };

  // My open orders for this market (lazy: only when Open orders tab is active or desktop)
  const myOpenOrders = useMemo(() => {
    if (!user?.id || !(activeTab === 'orders' || isDesktop)) return [];
    const list: Order[] = [];
    for (const ob of Object.values(orderbookByOutcome)) {
      for (const o of [...(ob.bids || []), ...(ob.asks || [])]) {
        if (o.user_id === user.id && (o.status === 'open' || o.status === 'partial')) list.push(o);
      }
    }
    return list;
  }, [activeTab, isDesktop, orderbookByOutcome, user?.id]);

  // My open orders for the currently selected outcome only (for "cancel all for this outcome" button)
  const myOrdersInSelectedOutcome = useMemo(() => {
    if (!user?.id || !selectedOrderbook) return [];
    const orders = [...(selectedOrderbook.bids || []), ...(selectedOrderbook.asks || [])];
    return orders.filter(
      (o) => o.user_id === user.id && (o.status === 'open' || o.status === 'partial')
    );
  }, [user?.id, selectedOrderbook]);

  async function doCancelOrder(orderId: number) {
    setCancelingOrderId(orderId);
    try {
      await api.cancelOrder(orderId);
      showToast('Order canceled successfully', 'success');
      await loadMarket(true);
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelingOrderId(null);
    }
  }

  function handleCancelOrder(orderId: number) {
    setConfirmCancelOrderId(orderId);
  }

  async function doCancelAllOrders() {
    if (myOpenOrders.length === 0) return;
    setCancelingAll(true);
    try {
      for (const order of myOpenOrders) {
        await api.cancelOrder(order.id);
      }
      showToast('All orders in this market canceled', 'success');
      await loadMarket(true);
    } catch (err: any) {
      console.error('Failed to cancel orders:', err);
      showToast(err.message || 'Failed to cancel some orders', 'error');
    } finally {
      setCancelingAll(false);
    }
  }

  function handleCancelAllOrders() {
    setConfirmCancelAllOpen(true);
  }

  async function doCancelAllOrdersForOutcome() {
    if (myOrdersInSelectedOutcome.length === 0) return;
    setCancelingAllForOutcome(true);
    setConfirmCancelAllForOutcome(false);
    try {
      for (const order of myOrdersInSelectedOutcome) {
        await api.cancelOrder(order.id);
      }
      showToast(`Canceled ${myOrdersInSelectedOutcome.length} order(s) for this outcome`, 'success');
      await loadMarket(true);
    } catch (err: any) {
      console.error('Failed to cancel orders for outcome:', err);
      showToast(err?.message || 'Failed to cancel some orders', 'error');
    } finally {
      setCancelingAllForOutcome(false);
    }
  }

  function handleCancelAllOrdersForOutcome() {
    setConfirmCancelAllForOutcome(true);
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="rectangular" height="400px" className="rounded-lg" />
      </div>
    );
  }

  if (!market) {
    return <div className="text-center py-8">Market not found</div>;
  }

  // Sort outcomes by chance (descending) before rendering; Total Strokes keeps original order
  const sortedOutcomes = (outcomes || []).length > 0
    ? market?.market_id === 'market-total-strokes'
      ? [...(outcomes || [])]
      : [...(outcomes || [])].sort((a, b) => {
          const orderbookA = orderbookByOutcome?.[a.outcome_id];
          const orderbookB = orderbookByOutcome?.[b.outcome_id];
          const bestBidA = orderbookA?.bids?.[0];
          const bestAskA = orderbookA?.asks?.[0];
          const bestBidB = orderbookB?.bids?.[0];
          const bestAskB = orderbookB?.asks?.[0];
          const avgPriceA = bestBidA && bestAskA ? (bestBidA.price + bestAskA.price) / 2 : (bestBidA?.price || 0);
          const avgPriceB = bestBidB && bestAskB ? (bestBidB.price + bestAskB.price) / 2 : (bestBidB?.price || 0);
          return avgPriceB - avgPriceA;
        })
    : [];

  return (
    <PullToRefresh onRefresh={loadMarket}>
    <div className="space-y-4 sm:space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/markets')}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Back to Markets</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">{market.short_name}</h1>
        {market.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 max-w-2xl">
            {market.description}
          </p>
        )}
        {totalStrokesForecast != null && (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4">
            Forecast: {totalStrokesForecast.toLocaleString()} strokes
          </p>
        )}
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden">
        <Tabs
          tabs={[
            { id: 'outcomes', label: 'Outcomes' },
            { id: 'orders', label: 'Orders' },
            { id: 'trades', label: 'Trades' },
            { id: 'positions', label: 'Positions' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as typeof activeTab)}
        />
      </div>

      {/* Mobile Tab Content */}
      <div className="md:hidden">
        {activeTab === 'outcomes' && outcomes && outcomes.length > 0 && (
          <div className="mt-4">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full min-w-[320px] sm:min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="py-1.5 px-2 sm:py-2 sm:px-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      {showCurrentColumn && (
                        <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Current</th>
                      )}
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">No/Sell</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Yes/Buy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutcomes.map((outcome, index) => {
                        const orderbook = orderbookByOutcome[outcome.outcome_id];
                        const bestBid = orderbook?.bids?.[0];
                        const bestAsk = orderbook?.asks?.[0];
                        const yesPrice = bestBid ? bestBid.price : null;
                        const avgPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : (yesPrice || 0);
                        const chance = avgPrice ? Math.round((avgPrice / 10000) * 100) : 0;
                        const isSelected = selectedOutcomeId === outcome.outcome_id;
                        const currentScore = currentScores[outcome.name];
                        const currentDisplay = market?.market_id === 'market-individual-gross-champion'
                          ? formatScoreToPar(currentScore?.score_gross)
                          : formatScoreToPar(currentScore?.score_net);
                        
                        return (
                          <tr
                            key={outcome.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer touch-manipulation transition-colors ${
                              isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600 dark:border-l-primary-400' : ''
                            }`}
                            onClick={() => setSelectedOutcomeId((prev) => (prev === outcome.outcome_id ? '' : outcome.outcome_id))}
                          >
                            <td className="py-1.5 px-2 sm:py-2 sm:px-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-6 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {market?.market_id === 'market-h2h-matchups'
                                      ? formatH2HOutcomeWithIndexes(outcome.name, false)
                                      : (
                                          <>
                                            {outcome.name}
                                            {market?.market_id === 'market-individual-net-champion' && handicaps[outcome.name] != null && (
                                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal"> ({handicaps[outcome.name]})</span>
                                            )}
                                            {isVolatilityMarket && volatilityByPlayer[outcome.name] && (
                                              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal"> ({volatilityByPlayer[outcome.name].year} - {volatilityByPlayer[outcome.name].volatility} strokes)</span>
                                            )}
                                          </>
                                        )}
                                  </div>
                                  {positionByOutcome[outcome.outcome_id] && (() => {
                                    const pos = positionByOutcome[outcome.outcome_id];
                                    const { net_position, price_basis } = pos;
                                    const totalClosedCents = (pos.closed_profit ?? 0) + (pos.settled_profit ?? 0);
                                    if (net_position === 0) {
                                      if (totalClosedCents !== 0) {
                                        const isProfit = totalClosedCents >= 0;
                                        return (
                                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${isProfit ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
                                            {isProfit ? '+' : ''}{formatPriceBasis(totalClosedCents)}
                                          </span>
                                        );
                                      }
                                      return null;
                                    }
                                    const isLong = net_position > 0;
                                    return (
                                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${isLong ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                        {formatPositionChip(net_position, price_basis)}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                            {showCurrentColumn && (
                              <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                                <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                  {currentDisplay}
                                </span>
                              </td>
                            )}
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                {chance}%
                              </span>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAskClick(outcome.outcome_id, bestBid?.price || null);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 active:bg-purple-300 dark:active:bg-purple-700 touch-manipulation min-h-[44px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {bestBid ? formatPriceCents(bestBid.price) : '-'}
                                  {bestBid?.contract_size != null && bestBid.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestBid.contract_size}</span>
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBidClick(outcome.outcome_id, bestAsk?.price || null);
                                  }}
                                  className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 active:bg-blue-300 dark:active:bg-blue-700 touch-manipulation min-h-[44px] flex flex-col items-center justify-center transition-colors"
                                >
                                  {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                  {bestAsk?.contract_size != null && bestAsk.contract_size > 0 && (
                                    <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestAsk.contract_size}</span>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold">Your open orders</h2>
              {myOpenOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelAllOrders}
                  disabled={cancelingAll}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 disabled:opacity-50"
                >
                  {cancelingAll ? 'Canceling…' : 'Cancel all'}
                </button>
              )}
            </div>
            {myOpenOrders.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No open orders in this market. Place orders from the Outcomes tab.
              </div>
            ) : (
              <div className="space-y-2">
                {myOpenOrders.map((order) => {
                  const outcomeName = outcomes?.find(o => o.outcome_id === order.outcome)?.name ?? order.outcome;
                  const sideLabel = order.side === 0 ? 'Yes/Buy' : 'No/Sell';
                  const size = order.remaining_size ?? order.contract_size ?? 0;
                  const isCanceling = cancelingOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                        {outcomeName}
                      </span>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        order.side === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {sideLabel}
                      </span>
                      <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                        {formatPriceCents(order.price)} × {size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCanceling}
                        title="Cancel order"
                        aria-label="Cancel order"
                        className="flex-shrink-0 px-2 py-1 text-lg font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 touch-manipulation"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No recent trades
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map((trade) => {
                  const displaySide = trade.taker_side ?? trade.side;
                  const isBuy = displaySide === 0;
                  const isSell = displaySide === 1;
                  const sideLabel = isBuy ? 'Buy' : isSell ? 'Sell' : '—';
                  const sidePillClass = isBuy
                    ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                    : isSell
                    ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                    : 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white';

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded text-sm"
                    >
                      <span
                        className={`flex-shrink-0 px-3 py-1 rounded-md text-sm font-bold uppercase ${sidePillClass}`}
                        aria-label={sideLabel !== '—' ? sideLabel : 'Unknown side'}
                      >
                        {sideLabel}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {(trade.outcome_name ?? trade.outcome_ticker) && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_name ?? trade.outcome_ticker}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {trade.contracts} @ {formatPrice(trade.price)}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium flex-shrink-0">
                          {formatNotionalBySide(trade.price, trade.contracts, trade.taker_side ?? trade.side ?? 0)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap flex-shrink-0">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="mt-4">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : positionsToShow.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No positions
              </div>
            ) : (
              <div className="space-y-3">
                {positionsToShow.map((position) => {
                  const hasOpenPosition = position.net_position !== 0;
                  const { marketName, outcomeLabel } = getPositionDisplayNames(position);
                  const currentPrice = position.current_price !== null && position.current_price !== undefined 
                    ? position.current_price 
                    : null;
                  const costCents = position.net_position * position.price_basis;
                  const positionValueCents = hasOpenPosition ? getPositionValueCents(position, currentPrice) : null;
                  const diffCents =
                    hasOpenPosition && currentPrice !== null
                      ? position.net_position < 0
                        ? (position.price_basis - currentPrice) * Math.abs(position.net_position)
                        : position.net_position * currentPrice - costCents
                      : null;
                  const { riskCents, toProfitCents } =
                    position.net_position < 0
                      ? {
                          riskCents: (10000 - position.price_basis) * Math.abs(position.net_position),
                          toProfitCents: position.price_basis * Math.abs(position.net_position),
                        }
                      : {
                          riskCents: position.price_basis * position.net_position,
                          toProfitCents: (10000 - position.price_basis) * position.net_position,
                        };

                  return (
                    <Card key={position.id} className="mb-3">
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
                              {marketName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {outcomeLabel}
                            </p>
                            {hasOpenPosition ? (
                              <>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${position.net_position > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                  {formatPositionChip(position.net_position, position.price_basis)}
                                </span>
                                <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                  Risk: <span className="font-medium text-red-600 dark:text-red-400">{formatPriceBasis(riskCents)}</span>
                                  {' | '}
                                  To Profit: <span className="font-medium text-green-600 dark:text-green-400">{formatPriceBasis(toProfitCents)}</span>
                                </p>
                              </>
                            ) : (() => {
                              const totalClosedCard = (position.closed_profit ?? 0) + (position.settled_profit ?? 0);
                              if (totalClosedCard !== 0) {
                                const isProfitCard = totalClosedCard >= 0;
                                return (
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${isProfitCard ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
                                    {isProfitCard ? '+' : ''}{formatPriceBasis(totalClosedCard)}
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50">
                                  —
                                </span>
                              );
                            })()}
                          </div>
                          {hasOpenPosition && (
                            <div className="flex flex-col items-end text-right">
                              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                                {positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}
                              </div>
                              <div className={`text-sm sm:text-base font-semibold ${
                                diffCents !== null
                                  ? diffCents > 0 ? 'text-green-600 dark:text-green-400' 
                                    : diffCents < 0 ? 'text-red-600 dark:text-red-400' 
                                    : 'text-gray-600 dark:text-gray-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {diffCents !== null ? (
                                  <>{(diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : '')} {formatPrice(Math.abs(diffCents))}</>
                                ) : (
                                  '—'
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 -mx-2 sm:-mx-5 -mb-4 sm:-mb-5 px-2 sm:px-5 py-2 rounded-b-lg bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>Closed profit: <span className={`font-medium ${(position.closed_profit ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(position.closed_profit ?? 0)}</span></span>
                            <span>Settled profit: <span className={`font-medium ${(position.settled_profit ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(position.settled_profit ?? 0)}</span></span>
                          </div>
                          <div className="text-right shrink-0">
                            Bid: {position.best_bid != null ? formatPriceBasis(position.best_bid) : '—'} | Ask: {position.best_ask != null ? formatPriceBasis(position.best_ask) : '—'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Layout (unchanged) */}
      <div className="hidden md:block">
        {outcomes && outcomes.length > 0 ? (
          <div>
            {/* Outcomes Table */}
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full min-w-[320px] sm:min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-600">
                      <th className="py-1.5 px-2 sm:py-2 sm:px-3 text-left text-xs font-bold text-gray-600 dark:text-gray-400">Team</th>
                      {showCurrentColumn && (
                        <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Current</th>
                      )}
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Chance</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">No/Sell</th>
                      <th className="py-1.5 px-1 sm:py-2 sm:px-3 text-center text-xs font-bold text-gray-600 dark:text-gray-400">Yes/Buy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOutcomes.map((outcome, index) => {
                        const orderbook = orderbookByOutcome[outcome.outcome_id];
                        const bestBid = orderbook?.bids?.[0];
                        const bestAsk = orderbook?.asks?.[0];
                        const yesPrice = bestBid ? bestBid.price : null;
                        const avgPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : (yesPrice || 0);
                        const chance = avgPrice ? Math.round((avgPrice / 10000) * 100) : 0;
                        const isSelected = selectedOutcomeId === outcome.outcome_id;
                        const currentScoreDesktop = currentScores[outcome.name];
                        const currentDisplayDesktop = market?.market_id === 'market-individual-gross-champion'
                          ? formatScoreToPar(currentScoreDesktop?.score_gross)
                          : formatScoreToPar(currentScoreDesktop?.score_net);
                        
                        const desktopColSpan = showCurrentColumn ? 5 : 4;
                        const myOrdersInThisOutcome = (orderbook?.bids ?? []).concat(orderbook?.asks ?? []).filter((o: Order) => o.user_id === user?.id && (o.status === 'open' || o.status === 'partial'));
                        return (
                          <Fragment key={outcome.id}>
                            <tr
                              className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer touch-manipulation transition-colors ${
                                isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600 dark:border-l-primary-400' : ''
                              }`}
                              onClick={() => setSelectedOutcomeId((prev) => (prev === outcome.outcome_id ? '' : outcome.outcome_id))}
                            >
                              <td className="py-1.5 px-2 sm:py-2 sm:px-3">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4 sm:w-6 flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                                <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                                  {market?.market_id === 'market-h2h-matchups'
                                                    ? formatH2HOutcomeWithIndexes(outcome.name, false)
                                                    : (
                                                        <>
                                                          {outcome.name}
                                                          {market?.market_id === 'market-individual-net-champion' && handicaps[outcome.name] != null && (
                                                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal"> ({handicaps[outcome.name]})</span>
                                                          )}
                                                          {isVolatilityMarket && volatilityByPlayer[outcome.name] && (
                                                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-normal"> ({volatilityByPlayer[outcome.name].year} - {volatilityByPlayer[outcome.name].volatility} strokes)</span>
                                                          )}
                                                        </>
                                                      )}
                                                </div>
                                    {positionByOutcome[outcome.outcome_id] && (() => {
                                      const pos = positionByOutcome[outcome.outcome_id];
                                      const { net_position, price_basis } = pos;
                                      const totalClosedCentsDesktop = (pos.closed_profit ?? 0) + (pos.settled_profit ?? 0);
                                      if (net_position === 0) {
                                        if (totalClosedCentsDesktop !== 0) {
                                          const isProfitDesktop = totalClosedCentsDesktop >= 0;
                                          return (
                                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${isProfitDesktop ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
                                              {isProfitDesktop ? '+' : ''}{formatPriceBasis(totalClosedCentsDesktop)}
                                            </span>
                                          );
                                        }
                                        return null;
                                      }
                                      const isLong = net_position > 0;
                                      return (
                                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${isLong ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                          {formatPositionChip(net_position, price_basis)}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>
                              {showCurrentColumn && (
                                <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                                  <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                    {currentDisplayDesktop}
                                  </span>
                                </td>
                              )}
                              <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                                <span className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                                  {chance}%
                                </span>
                              </td>
                              <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                                <div className="flex justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAskClick(outcome.outcome_id, bestBid?.price || null);
                                    }}
                                    className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 active:bg-purple-300 dark:active:bg-purple-700 touch-manipulation min-h-[44px] flex flex-col items-center justify-center transition-colors"
                                  >
                                    {bestBid ? formatPriceCents(bestBid.price) : '-'}
                                    {bestBid?.contract_size != null && bestBid.contract_size > 0 && (
                                      <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestBid.contract_size}</span>
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="py-1.5 px-1 sm:py-2 sm:px-3 text-center">
                                <div className="flex justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBidClick(outcome.outcome_id, bestAsk?.price || null);
                                    }}
                                    className="w-[60px] sm:w-[100px] px-1 sm:px-2 py-1 sm:py-1.5 rounded text-xs font-bold whitespace-nowrap bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 active:bg-blue-300 dark:active:bg-blue-700 touch-manipulation min-h-[44px] flex flex-col items-center justify-center transition-colors"
                                  >
                                    {bestAsk ? formatPriceCents(bestAsk.price) : '-'}
                                    {bestAsk?.contract_size != null && bestAsk.contract_size > 0 && (
                                      <span className="text-[10px] sm:text-xs font-normal opacity-90 mt-0.5">x {bestAsk.contract_size}</span>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isSelected && orderbook && (
                              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <td colSpan={desktopColSpan} className="p-0 align-top">
                                  <div className="px-3 py-3 sm:px-4 sm:py-4 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        Orderbook — {outcome.name}
                                        {isVolatilityMarket && volatilityByPlayer[outcome.name] && (
                                          <> ({volatilityByPlayer[outcome.name].year} - {volatilityByPlayer[outcome.name].volatility} strokes)</>
                                        )}
                                        {lastTradePriceByOutcome[outcome.outcome_id] != null && (
                                          <> | Last: {formatPriceCents(lastTradePriceByOutcome[outcome.outcome_id])}</>
                                        )}
                                      </span>
                                      {myOrdersInThisOutcome.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleCancelAllOrdersForOutcome(); }}
                                          disabled={cancelingAllForOutcome}
                                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 p-1 rounded touch-manipulation font-bold text-sm leading-none"
                                          title="Cancel all your orders for this outcome"
                                          aria-label="Cancel all your orders for this outcome"
                                        >
                                          Cancel all my orders
                                        </button>
                                      )}
                                    </div>
                                    <div className="max-h-[280px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                                      <Orderbook
                                        bids={orderbook.bids}
                                        asks={orderbook.asks}
                                        userId={user?.id}
                                        onPriceClick={(price, side) => {
                                          const priceDollars = Math.round(price / 100);
                                          const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                                          setOrderPrice(clampedPrice.toString());
                                          setOrderSide(side);
                                          setAutoFilled('price');
                                          setTimeout(() => setAutoFilled(null), 2000);
                                        }}
                                        onCancelOrder={async (orderId) => {
                                          try {
                                            await api.cancelOrder(orderId);
                                            showToast('Order canceled successfully', 'success');
                                            await loadMarket(true);
                                          } catch (err: any) {
                                            console.error('Failed to cancel order:', err);
                                            showToast(err?.message || 'Failed to cancel order', 'error');
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No outcomes available for this market
          </div>
        )}

        {/* Orderbook and Order Form — on desktop, orderbook is in accordion under outcome row */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mt-6">
          {/* Orderbook Section — hidden on desktop (orderbook shown in accordion under outcome) */}
          <div className="min-w-0 max-md:block md:hidden">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold">
                Orderbook
                {selectedOutcomeId && selectedOutcomeName && (
                  <> — {selectedOutcomeName}{lastPriceSelected != null ? ` | Last: ${formatPriceCents(lastPriceSelected)}` : ''}</>
                )}
              </h2>
              {selectedOutcomeId && selectedOrderbook && myOrdersInSelectedOutcome.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelAllOrdersForOutcome}
                  disabled={cancelingAllForOutcome}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 p-1.5 rounded touch-manipulation font-bold text-lg leading-none"
                  title="Cancel all your orders for this outcome"
                  aria-label="Cancel all your orders for this outcome"
                >
                  ×
                </button>
              )}
            </div>
            {selectedOutcomeId && selectedOrderbook ? (
              <Orderbook
                bids={selectedOrderbook.bids}
                asks={selectedOrderbook.asks}
                userId={user?.id}
                onPriceClick={(price, side) => {
                  const priceDollars = Math.round(price / 100);
                  // Clamp to 1-99 range
                  const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                  setOrderPrice(clampedPrice.toString());
                  setOrderSide(side);
                  setAutoFilled('price');
                  setTimeout(() => setAutoFilled(null), 2000);
                }}
                onCancelOrder={async (orderId) => {
                  try {
                    await api.cancelOrder(orderId);
                    showToast('Order canceled successfully', 'success');
                    await loadMarket(true);
                  } catch (err: any) {
                    console.error('Failed to cancel order:', err);
                    showToast(err.message || 'Failed to cancel order', 'error');
                  }
                }}
              />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                Select an outcome to view orderbook
              </div>
            )}
          </div>

        {/* Order Form Section — full width on desktop when orderbook is in accordion */}
        <div className="min-w-0 md:col-span-2">
          {/* Mobile: Floating Action Button */}
          <button
            onClick={() => setBottomSheetOpen(true)}
            className={`md:hidden fixed bottom-20 right-4 z-30 text-white rounded-full p-4 shadow-lg touch-manipulation min-h-[56px] min-w-[56px] flex items-center justify-center ${
              orderSide === 'ask'
                ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                : orderSide === 'market_maker'
                  ? 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
            aria-label={orderSide === 'market_maker' ? 'Place order' : orderSide === 'ask' ? 'Place sell order' : 'Place buy order'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Desktop: Inline Form */}
          <div className="hidden md:block">
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
              {orderSide === 'market_maker' ? 'Place Order' : orderSide === 'ask' ? 'Place Sell Order' : 'Place Buy Order'}
            </h2>
            <form onSubmit={handlePlaceOrder} className="space-y-3 sm:space-y-4">
              {outcomes && outcomes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Outcome</label>
                  <select
                    value={selectedOutcomeId}
                    onChange={(e) => setSelectedOutcomeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 touch-manipulation"
                  >
                    <option value="">Select an outcome</option>
                    {outcomes.map((outcome) => (
                      <option key={outcome.id} value={outcome.outcome_id}>
                        {market?.market_id === 'market-h2h-matchups'
                          ? formatH2HOutcomeWithIndexes(outcome.name, true)
                          : market?.market_id === 'market-individual-net-champion' && handicaps[outcome.name] != null
                            ? `${outcome.name} (${handicaps[outcome.name]})`
                            : isVolatilityMarket && volatilityByPlayer[outcome.name]
                              ? `${outcome.name} (${volatilityByPlayer[outcome.name].year} - ${volatilityByPlayer[outcome.name].volatility} strokes)`
                              : (outcome.name ?? outcome.ticker)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Side</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSideChange('ask')}
                    className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'ask'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    No/Sell {bestBid ? formatPriceCents(bestBid.price) : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSideChange('bid')}
                    className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'bid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Yes/Buy {bestAsk ? formatPriceCents(bestAsk.price) : ''}
                  </button>
                  {user?.view_market_maker && (
                  <button
                    type="button"
                    onClick={() => handleSideChange('market_maker')}
                    className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-sm sm:text-base min-h-[44px] touch-manipulation ${
                      orderSide === 'market_maker'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Market Maker
                  </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
                />
              </div>

              {orderSide === 'market_maker' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Bid price ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={1}
                        max={99}
                        value={mmBidPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) setMmBidPrice(value);
                        }}
                        placeholder="1-99"
                        className="w-full pl-8 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Ask price ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={1}
                        max={99}
                        value={mmAskPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) setMmAskPrice(value);
                        }}
                        placeholder="1-99"
                        className="w-full pl-8 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px]"
                      />
                    </div>
                  </div>
                </>
              ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5">Price ($)</label>
                {selectedOrderbook && (bestBid || bestAsk || lastPriceSelected != null) && (
                  <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      Bid: {bestBid ? <><span className="font-medium text-blue-600 dark:text-blue-400">{formatPriceCents(bestBid.price)}</span> × {bestBid.contract_size ?? '—'}</> : '—'}
                      {' | '}
                      Ask: {bestAsk ? <><span className="font-medium text-purple-600 dark:text-purple-400">{formatPriceCents(bestAsk.price)}</span> × {bestAsk.contract_size ?? '—'}</> : '—'}
                      {lastPriceSelected != null && (
                        <> {' | '} Last: <span className="font-medium text-gray-700 dark:text-gray-300">{formatPriceCents(lastPriceSelected)}</span></>
                      )}
                    </span>
                  </div>
                )}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                step="1"
                min="1"
                max="99"
                value={orderPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow whole numbers 1-99
                  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) {
                    setOrderPrice(value);
                    setAutoFilled(null);
                  }
                }}
                required
                className={`w-full pl-8 pr-4 py-3 text-base border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
                {autoFilled === 'price' && (
                  <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                    Auto-filled from table
                  </div>
                )}
              </div>
              )}

              {/* View orderbook toggle */}
              {selectedOutcomeId && selectedOrderbook && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOrderbookInForm((v) => !v)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    {showOrderbookInForm ? 'Hide orderbook' : 'View orderbook'}
                    <svg className={`w-4 h-4 transition-transform ${showOrderbookInForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOrderbookInForm && (
                    <div className="mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 max-h-[200px] overflow-y-auto">
                      <Orderbook
                        bids={selectedOrderbook.bids}
                        asks={selectedOrderbook.asks}
                        userId={user?.id}
                        onPriceClick={(price, side) => {
                          const priceDollars = Math.round(price / 100);
                          const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                          setOrderPrice(clampedPrice.toString());
                          setOrderSide(side);
                        }}
                        onCancelOrder={async (orderId) => {
                          try {
                            await api.cancelOrder(orderId);
                            showToast('Order canceled successfully', 'success');
                            await loadMarket(true);
                          } catch (err: any) {
                            showToast(err?.message || 'Failed to cancel order', 'error');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Order Summary */}
              {orderSide === 'market_maker' ? (
                orderSummary.qty > 0 && orderSummary.mmBidPrice > 0 && orderSummary.mmAskPrice > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Bid: ${orderSummary.mmBidPrice} × {orderSummary.qty}, Ask: ${orderSummary.mmAskPrice} × {orderSummary.qty}
                    </div>
                  </div>
                )
              ) : (
                orderPrice && orderQty && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Total:</span>
                      <span className="text-lg font-semibold">{formatPrice(orderSummary.totalCost * 100)}</span>
                    </div>
                  </div>
                )
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 min-h-[44px] text-base touch-manipulation ${
                  orderSide === 'ask'
                    ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                    : orderSide === 'market_maker'
                      ? 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                }`}
              >
                {submitting ? 'Placing...' : orderSide === 'market_maker' ? 'Place both' : orderSide === 'ask' ? 'Place Sell Order' : 'Place Buy Order'}
              </button>
            </form>
          </div>
        </div>

          {/* Your open orders (desktop) */}
          <div className="mt-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base sm:text-lg font-bold">Your open orders</h2>
              {myOpenOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelAllOrders}
                  disabled={cancelingAll}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 disabled:opacity-50"
                >
                  {cancelingAll ? 'Canceling…' : 'Cancel all'}
                </button>
              )}
            </div>
            {myOpenOrders.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No open orders in this market.
              </div>
            ) : (
              <div className="space-y-2">
                {myOpenOrders.map((order) => {
                  const outcomeName = outcomes?.find(o => o.outcome_id === order.outcome)?.name ?? order.outcome;
                  const sideLabel = order.side === 0 ? 'Yes/Buy' : 'No/Sell';
                  const size = order.remaining_size ?? order.contract_size ?? 0;
                  const isCanceling = cancelingOrderId === order.id;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate min-w-0 flex-1">
                        {outcomeName}
                      </span>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                        order.side === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {sideLabel}
                      </span>
                      <span className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                        {formatPriceCents(order.price)} × {size}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isCanceling}
                        title="Cancel order"
                        aria-label="Cancel order"
                        className="flex-shrink-0 px-2 py-1 text-lg font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Positions Section */}
          {positionsToShow.length > 0 && (
            <div className="mt-6">
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Your Positions</h2>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {positionsToShow.map((position) => {
                    const hasOpenPosition = position.net_position !== 0;
                    const { marketName, outcomeLabel } = getPositionDisplayNames(position);
                    const currentPrice = position.current_price !== null && position.current_price !== undefined 
                      ? position.current_price 
                      : null;
                    const costCents = position.net_position * position.price_basis;
                    const positionValueCents = hasOpenPosition ? getPositionValueCents(position, currentPrice) : null;
                    const diffCents =
                      hasOpenPosition && currentPrice !== null
                        ? position.net_position < 0
                          ? (position.price_basis - currentPrice) * Math.abs(position.net_position)
                          : position.net_position * currentPrice - costCents
                        : null;
                    const { riskCents, toProfitCents } =
                      position.net_position < 0
                        ? {
                            riskCents: (10000 - position.price_basis) * Math.abs(position.net_position),
                            toProfitCents: position.price_basis * Math.abs(position.net_position),
                          }
                        : {
                            riskCents: position.price_basis * position.net_position,
                            toProfitCents: (10000 - position.price_basis) * position.net_position,
                          };

                    return (
                      <Card key={position.id} className="mb-3">
                        <CardContent>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1">
                                {marketName}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {outcomeLabel}
                              </p>
                              {hasOpenPosition ? (
                                <>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${position.net_position > 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'}`}>
                                    {formatPositionChip(position.net_position, position.price_basis)}
                                  </span>
                                  <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                    Risk: <span className="font-medium text-red-600 dark:text-red-400">{formatPriceBasis(riskCents)}</span>
                                    {' | '}
                                    To Profit: <span className="font-medium text-green-600 dark:text-green-400">{formatPriceBasis(toProfitCents)}</span>
                                  </p>
                                </>
                              ) : (() => {
                                const totalClosedCard2 = (position.closed_profit ?? 0) + (position.settled_profit ?? 0);
                                if (totalClosedCard2 !== 0) {
                                  const isProfitCard2 = totalClosedCard2 >= 0;
                                  return (
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${isProfitCard2 ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'}`}>
                                      {isProfitCard2 ? '+' : ''}{formatPriceBasis(totalClosedCard2)}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50">
                                    —
                                  </span>
                                );
                              })()}
                            </div>
                            {hasOpenPosition && (
                              <div className="flex flex-col items-end text-right">
                                <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                                  {positionValueCents !== null ? formatPriceDecimal(positionValueCents) : formatPriceDecimal(costCents)}
                                </div>
                                <div className={`text-sm sm:text-base font-semibold ${
                                  diffCents !== null
                                    ? diffCents > 0 ? 'text-green-600 dark:text-green-400' 
                                      : diffCents < 0 ? 'text-red-600 dark:text-red-400' 
                                      : 'text-gray-600 dark:text-gray-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {diffCents !== null ? (
                                    <>{(diffCents > 0 ? '↑' : diffCents < 0 ? '↓' : '')} {formatPrice(Math.abs(diffCents))}</>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 -mx-2 sm:-mx-5 -mb-4 sm:-mb-5 px-2 sm:px-5 py-2 rounded-b-lg bg-gray-100 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>Closed profit: <span className={`font-medium ${(position.closed_profit ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(position.closed_profit ?? 0)}</span></span>
                              <span>Settled profit: <span className={`font-medium ${(position.settled_profit ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPriceBasis(position.settled_profit ?? 0)}</span></span>
                            </div>
                            <div className="text-right shrink-0">
                              Bid: {position.best_bid != null ? formatPriceBasis(position.best_bid) : '—'} | Ask: {position.best_ask != null ? formatPriceBasis(position.best_ask) : '—'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recent Trades Section */}
          <div className="mt-6">
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Recent Trades</h2>
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ) : !trades || trades.length === 0 ? (
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                No trades yet
              </div>
            ) : (
              <div className="space-y-2">
                {trades.map((trade) => {
                  const displaySide = trade.taker_side ?? trade.side;
                  const isBuy = displaySide === 0;
                  const isSell = displaySide === 1;
                  const sideLabel = isBuy ? 'Buy' : isSell ? 'Sell' : '—';
                  const sidePillClass = isBuy
                    ? 'bg-green-600 text-white dark:bg-green-500 dark:text-white'
                    : isSell
                    ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                    : 'bg-gray-400 text-white dark:bg-gray-500 dark:text-white';

                  return (
                    <div
                      key={trade.id}
                      className="flex items-center gap-3 p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm"
                    >
                      <span
                        className={`flex-shrink-0 px-3 py-1 rounded-md text-xs sm:text-sm font-bold uppercase ${sidePillClass}`}
                        aria-label={sideLabel !== '—' ? sideLabel : 'Unknown side'}
                      >
                        {sideLabel}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {(trade.outcome_name ?? trade.outcome_ticker) && (
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {trade.outcome_name ?? trade.outcome_ticker}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {trade.contracts} @ {formatPrice(trade.price)}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium flex-shrink-0">
                          {formatNotionalBySide(trade.price, trade.contracts, trade.taker_side ?? trade.side ?? 0)}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap flex-shrink-0">
                        {trade.create_time ? format(new Date(trade.create_time * 1000), 'M/d h:mm a') : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet for Order Form */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => {
          setBottomSheetOpen(false);
          setOrderPrice('');
          setOrderQty('');
          setMmBidPrice('');
          setMmAskPrice('');
          setShowOrderbookInForm(false);
        }}
        title={orderSide === 'market_maker' ? 'Place Order' : orderSide === 'ask' ? 'Place Sell Order' : 'Place Buy Order'}
      >
        <form onSubmit={(e) => {
          handlePlaceOrder(e);
          setBottomSheetOpen(false);
        }} className="space-y-4">
          {outcomes && outcomes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Outcome</label>
              <select
                value={selectedOutcomeId}
                onChange={(e) => setSelectedOutcomeId(e.target.value)}
                required
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 touch-manipulation min-h-[44px]"
              >
                <option value="">Select an outcome</option>
                {outcomes.map((outcome) => (
                  <option key={outcome.outcome_id} value={outcome.outcome_id}>
                    {market?.market_id === 'market-h2h-matchups'
                      ? formatH2HOutcomeWithIndexes(outcome.name, true)
                      : market?.market_id === 'market-individual-net-champion' && handicaps[outcome.name] != null
                        ? `${outcome.name} (${handicaps[outcome.name]})`
                        : isVolatilityMarket && volatilityByPlayer[outcome.name]
                          ? `${outcome.name} (${volatilityByPlayer[outcome.name].year} - ${volatilityByPlayer[outcome.name].volatility} strokes)`
                          : (outcome.name ?? outcome.ticker)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Side</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSideChange('ask')}
                className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'ask'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                No/Sell {bestBid ? formatPriceCents(bestBid.price) : ''}
              </button>
              <button
                type="button"
                onClick={() => handleSideChange('bid')}
                className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'bid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                Yes/Buy {bestAsk ? formatPriceCents(bestAsk.price) : ''}
              </button>
              {user?.view_market_maker && (
              <button
                type="button"
                onClick={() => handleSideChange('market_maker')}
                className={`flex-1 min-w-0 py-3 px-4 rounded font-medium text-base min-h-[44px] touch-manipulation ${
                  orderSide === 'market_maker'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                Market Maker
              </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              ref={quantityInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              value={orderQty}
              onChange={(e) => setOrderQty(e.target.value)}
              required
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px]"
              placeholder="Enter quantity"
            />
          </div>

          {orderSide === 'market_maker' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Bid price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={99}
                    value={mmBidPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) setMmBidPrice(value);
                    }}
                    placeholder="1-99"
                    className="w-full pl-8 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ask price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={99}
                    value={mmAskPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) setMmAskPrice(value);
                    }}
                    placeholder="1-99"
                    className="w-full pl-8 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px]"
                  />
                </div>
              </div>
            </>
          ) : (
          <div>
            <label className="block text-sm font-medium mb-2">Price ($)</label>
            {selectedOrderbook && (bestBid || bestAsk || lastPriceSelected != null) && (
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                <span>
                  Bid: {bestBid ? <><span className="font-medium text-blue-600 dark:text-blue-400">{formatPriceCents(bestBid.price)}</span> × {bestBid.contract_size ?? '—'}</> : '—'}
                  {' | '}
                  Ask: {bestAsk ? <><span className="font-medium text-purple-600 dark:text-purple-400">{formatPriceCents(bestAsk.price)}</span> × {bestAsk.contract_size ?? '—'}</> : '—'}
                  {lastPriceSelected != null && (
                    <> {' | '} Last: <span className="font-medium text-gray-700 dark:text-gray-300">{formatPriceCents(lastPriceSelected)}</span></>
                  )}
                </span>
              </div>
            )}
          <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">$</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                step="1"
                min="1"
                max="99"
                value={orderPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 99)) {
                    setOrderPrice(value);
                    setAutoFilled(null);
                  }
                }}
                required
                className={`w-full pl-8 pr-4 py-3 text-base border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[44px] ${
                  autoFilled === 'price' ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="1-99"
              />
            </div>
          </div>
          )}

          {/* View orderbook toggle */}
          {selectedOutcomeId && selectedOrderbook && (
            <div>
              <button
                type="button"
                onClick={() => setShowOrderbookInForm((v) => !v)}
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                {showOrderbookInForm ? 'Hide orderbook' : 'View orderbook'}
                <svg className={`w-4 h-4 transition-transform ${showOrderbookInForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOrderbookInForm && (
                <div className="mt-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50 max-h-[200px] overflow-y-auto">
                  <Orderbook
                    bids={selectedOrderbook.bids}
                    asks={selectedOrderbook.asks}
                    userId={user?.id}
                    onPriceClick={(price, side) => {
                      const priceDollars = Math.round(price / 100);
                      const clampedPrice = Math.max(1, Math.min(99, priceDollars));
                      setOrderPrice(clampedPrice.toString());
                      setOrderSide(side);
                    }}
                    onCancelOrder={async (orderId) => {
                      try {
                        await api.cancelOrder(orderId);
                        showToast('Order canceled successfully', 'success');
                        await loadMarket(true);
                      } catch (err: any) {
                        showToast(err?.message || 'Failed to cancel order', 'error');
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          {orderSide === 'market_maker' ? (
            orderSummary.qty > 0 && orderSummary.mmBidPrice > 0 && orderSummary.mmAskPrice > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Bid: ${orderSummary.mmBidPrice} × {orderSummary.qty}, Ask: ${orderSummary.mmAskPrice} × {orderSummary.qty}
                </div>
              </div>
            )
          ) : (
            orderPrice && orderQty && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Total:</span>
                  <span className="text-lg font-semibold">{formatPrice(orderSummary.totalCost * 100)}</span>
                </div>
              </div>
            )
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full text-white font-medium py-3 px-4 rounded-md disabled:opacity-50 min-h-[44px] text-base touch-manipulation ${
              orderSide === 'ask'
                ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
                : orderSide === 'market_maker'
                  ? 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {submitting ? 'Placing...' : orderSide === 'market_maker' ? 'Place both' : orderSide === 'ask' ? 'Place Sell Order' : 'Place Buy Order'}
          </button>
        </form>
      </BottomSheet>

      <ConfirmModal
        isOpen={confirmCancelOrderId != null}
        onClose={() => setConfirmCancelOrderId(null)}
        onConfirm={() => { if (confirmCancelOrderId != null) doCancelOrder(confirmCancelOrderId); }}
        title="Cancel order"
        message="Are you sure you want to cancel this order?"
        confirmLabel="Cancel order"
        cancelLabel="Keep"
        variant="danger"
      />
      <ConfirmModal
        isOpen={confirmCancelAllOpen}
        onClose={() => setConfirmCancelAllOpen(false)}
        onConfirm={doCancelAllOrders}
        title="Cancel all orders"
        message="Are you sure you want to cancel all open orders in this market?"
        confirmLabel="Cancel all"
        cancelLabel="Keep"
        variant="danger"
      />
      <ConfirmModal
        isOpen={confirmCancelAllForOutcome}
        onClose={() => setConfirmCancelAllForOutcome(false)}
        onConfirm={doCancelAllOrdersForOutcome}
        title="Cancel all orders for this outcome"
        message={`Cancel all ${myOrdersInSelectedOutcome.length} open order(s) for this outcome?`}
        confirmLabel="Cancel all"
        cancelLabel="Keep"
        variant="danger"
      />

      {/* Trading volume chip at bottom */}
      <div className="flex justify-center pt-4 pb-2 md:pt-6 md:pb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
          <span>Trading volume</span>
          <span className="font-semibold text-gray-900 dark:text-gray-200">${marketStats.volume_dollars.toLocaleString()}</span>
        </span>
      </div>

      {/* Spacer for mobile bottom nav and FAB */}
      <div className="md:hidden h-24"></div>
    </div>
    </PullToRefresh>
  );
}
