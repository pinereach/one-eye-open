import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card';
import { PullToRefresh } from '../components/ui/PullToRefresh';

type LeaderboardRow = {
  user_id: number;
  username: string;
  trade_count: number;
  open_orders_count: number;
  shares_traded: number;
  portfolio_value_cents: number;
  closed_profit_cents: number;
  settled_profit_cents: number;
};

type SortKey = 'username' | 'trade_count' | 'open_orders_count' | 'shares_traded' | 'portfolio_value_cents' | 'closed_profit_cents' | 'settled_profit_cents';
type SortDir = 'asc' | 'desc';

function formatPortfolio(cents: number, signed = false): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!signed) return `$${str}`;
  return cents >= 0 ? `+$${str}` : `-$${str}`;
}

const DEFAULT_SORT: SortKey = 'shares_traded';
const DEFAULT_SORT_DIR: SortDir = 'desc';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [unattributedCents, setUnattributedCents] = useState<number>(0);
  const [unattributedClosedCents, setUnattributedClosedCents] = useState<number>(0);
  const [unattributedSettledCents, setUnattributedSettledCents] = useState<number>(0);
  const [systemTotalCents, setSystemTotalCents] = useState<number>(0);
  const [pnlByOutcome, setPnlByOutcome] = useState<Record<string, number>>({});
  const [positionContributions, setPositionContributions] = useState<Array<{ outcome: string; user_id: number | null; contribution_cents: number }>>([]);
  const [systemTotalClosedCents, setSystemTotalClosedCents] = useState<number>(0);
  const [systemTotalSettledCents, setSystemTotalSettledCents] = useState<number>(0);
  const [closedProfitByOutcome, setClosedProfitByOutcome] = useState<Record<string, number>>({});
  const [settledProfitByOutcome, setSettledProfitByOutcome] = useState<Record<string, number>>({});
  const [closedProfitContributions, setClosedProfitContributions] = useState<Array<{ outcome: string; user_id: number | null; closed_profit_cents: number }>>([]);
  const [settledProfitContributions, setSettledProfitContributions] = useState<Array<{ outcome: string; user_id: number | null; settled_profit_cents: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>(DEFAULT_SORT);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);
  const [debugExpanded, setDebugExpanded] = useState(false);

  const sortedLeaderboard = useMemo(() => {
    if (leaderboard.length === 0) return [];
    const key = sortBy;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...leaderboard].sort((a, b) => {
      let cmp = 0;
      if (key === 'username') {
        cmp = (a.username ?? '').localeCompare(b.username ?? '');
      } else {
        const va = key === 'portfolio_value_cents' ? a.portfolio_value_cents : key === 'closed_profit_cents' ? a.closed_profit_cents : key === 'settled_profit_cents' ? a.settled_profit_cents : key === 'trade_count' ? a.trade_count : key === 'open_orders_count' ? a.open_orders_count : a.shares_traded;
        const vb = key === 'portfolio_value_cents' ? b.portfolio_value_cents : key === 'closed_profit_cents' ? b.closed_profit_cents : key === 'settled_profit_cents' ? b.settled_profit_cents : key === 'trade_count' ? b.trade_count : key === 'open_orders_count' ? b.open_orders_count : b.shares_traded;
        cmp = va - vb;
      }
      return cmp * dir;
    });
  }, [leaderboard, sortBy, sortDir]);

  /** Minimal list of "who pays whom" to settle everyone's settled P&L. Greedy: match largest creditor with largest debtor. */
  const settleUpPayments = useMemo(() => {
    const owed = leaderboard
      .filter((r) => r.settled_profit_cents > 0)
      .map((r) => ({ username: r.username, user_id: r.user_id, cents: r.settled_profit_cents }))
      .sort((a, b) => b.cents - a.cents);
    const owe = leaderboard
      .filter((r) => r.settled_profit_cents < 0)
      .map((r) => ({ username: r.username, user_id: r.user_id, cents: -r.settled_profit_cents }))
      .sort((a, b) => b.cents - a.cents);
    const payments: Array<{ from: string; fromId: number; to: string; toId: number; cents: number }> = [];
    let i = 0;
    let j = 0;
    while (i < owed.length && j < owe.length) {
      const amount = Math.min(owed[i].cents, owe[j].cents);
      if (amount > 0) {
        payments.push({
          from: owe[j].username,
          fromId: owe[j].user_id,
          to: owed[i].username,
          toId: owed[i].user_id,
          cents: amount,
        });
      }
      owed[i].cents -= amount;
      owe[j].cents -= amount;
      if (owed[i].cents === 0) i += 1;
      if (owe[j].cents === 0) j += 1;
    }
    return payments;
  }, [leaderboard]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'username' ? 'asc' : 'desc');
    }
  }

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminGetLeaderboard();
      const { leaderboard: data, unattributed_portfolio_value_cents: unattributed, unattributed_closed_profit_cents: unattributedClosed, unattributed_settled_profit_cents: unattributedSettled, system_total_portfolio_value_cents: systemTotal, pnl_by_outcome: byOutcome, position_contributions: contributions, system_total_closed_profit_cents: sysClosed, system_total_settled_profit_cents: sysSettled, closed_profit_by_outcome: closedByOutcome, settled_profit_by_outcome: settledByOutcome, closed_profit_contributions: closedContrib, settled_profit_contributions: settledContrib } = res;
      setLeaderboard(data ?? []);
      setUnattributedCents(unattributed ?? 0);
      setUnattributedClosedCents(unattributedClosed ?? 0);
      setUnattributedSettledCents(unattributedSettled ?? 0);
      setSystemTotalCents(systemTotal ?? 0);
      setPnlByOutcome(byOutcome ?? {});
      setPositionContributions(contributions ?? []);
      setSystemTotalClosedCents(sysClosed ?? 0);
      setSystemTotalSettledCents(sysSettled ?? 0);
      setClosedProfitByOutcome(closedByOutcome ?? {});
      setSettledProfitByOutcome(settledByOutcome ?? {});
      setClosedProfitContributions(closedContrib ?? []);
      setSettledProfitContributions(settledContrib ?? []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.admin) loadLeaderboard();
  }, [user?.admin]);

  if (user && !user.admin) {
    return <Navigate to="/markets" replace />;
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadLeaderboard}>
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Leaderboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Per-user stats: trades, open orders, shares traded, closed profit (realized P&amp;L), settled profit, portfolio value (unrealized P&amp;L only). Portfolio value is zero-sum (system total should be $0). Closed and settled profit are separate.</p>

        {/* Settle up: minimal payments so everyone is square on settled P&L */}
        {leaderboard.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">Settle up (settled P&amp;L)</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Fewest payments so everyone is paid. Based on each person&apos;s settled profit (positive = owed, negative = owes).
              </p>
              {settleUpPayments.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">Everyone is square — no payments needed.</p>
              ) : (
                <ul className="space-y-2" aria-label="Settle-up payments">
                  {settleUpPayments.map((p, idx) => (
                    <li key={`${p.fromId}-${p.toId}-${idx}`} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{p.from}</span>
                      <span className="text-gray-500 dark:text-gray-400">pays</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{p.to}</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 ml-1">{formatPortfolio(p.cents, false)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {unattributedSettledCents !== 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                  Note: Unattributed settled profit is {formatPortfolio(unattributedSettledCents, true)} — not included in the list above.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Debug: system total — if non-zero, indicates a bug elsewhere in the stack */}
        {leaderboard.length > 0 && (
          <div className={`rounded-lg border ${systemTotalCents === 0 ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80' : 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20'}`}>
            <button
              type="button"
              onClick={() => setDebugExpanded((e) => !e)}
              className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-expanded={debugExpanded}
            >
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Debug checks</span>
              <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform ${debugExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {debugExpanded && (
            <div className="px-4 pb-4 pt-0">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Unrealized P&amp;L (portfolio value)</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><span className="text-gray-600 dark:text-gray-400">System total (sum of all position unrealized P&amp;L):</span>{' '}
                <span className={`font-semibold ${systemTotalCents === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatPortfolio(systemTotalCents, true)}
                </span>
                {systemTotalCents !== 0 && <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">(should be $0 — check trade/position logic)</span>}
              </span>
              <span><span className="text-gray-600 dark:text-gray-400">Users + Unattributed (unrealized):</span>{' '}
                <span className={`font-semibold ${leaderboard.reduce((s, r) => s + r.portfolio_value_cents, 0) + unattributedCents === systemTotalCents ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatPortfolio(leaderboard.reduce((s, r) => s + r.portfolio_value_cents, 0) + unattributedCents, true)}
                </span>
                {(leaderboard.reduce((s, r) => s + r.portfolio_value_cents, 0) + unattributedCents) !== systemTotalCents && <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">(should equal system total)</span>}
              </span>
            </div>
            {systemTotalCents !== 0 && (Object.keys(pnlByOutcome).length > 0 || positionContributions.length > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Where the unrealized imbalance comes from</div>
                {Object.keys(pnlByOutcome).length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Unrealized P&amp;L by outcome (should be $0 per outcome in zero-sum):</span>
                    <ul className="mt-1 space-y-0.5 text-sm font-mono">
                      {Object.entries(pnlByOutcome)
                        .filter(([, cents]) => cents !== 0)
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                        .map(([outcome, cents]) => (
                          <li key={outcome} className={cents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {outcome}: {formatPortfolio(cents, true)}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {positionContributions.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Top position contributions (user_id, outcome, unrealized P&amp;L):</span>
                    <ul className="mt-1 space-y-0.5 text-sm font-mono max-h-40 overflow-y-auto">
                      {positionContributions.slice(0, 20).map((pc, i) => (
                        <li key={i} className={pc.contribution_cents > 0 ? 'text-green-600 dark:text-green-400' : pc.contribution_cents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}>
                          user {pc.user_id ?? 'null'} · {pc.outcome}: {formatPortfolio(pc.contribution_cents, true)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Closed / settled profit — closed is per-user realized P&L (total may be non-zero); settled should sum to $0 */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Closed / settled profit</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-2">
                <span><span className="text-gray-600 dark:text-gray-400">System total closed:</span>{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {formatPortfolio(systemTotalClosedCents, true)}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(per-user realized P&amp;L; total may be non-zero)</span>
                </span>
                <span><span className="text-gray-600 dark:text-gray-400">System total settled:</span>{' '}
                  <span className={`font-semibold ${systemTotalSettledCents === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {formatPortfolio(systemTotalSettledCents, true)}
                  </span>
                  {systemTotalSettledCents !== 0 && <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">(should be $0)</span>}
                </span>
              </div>
              {systemTotalClosedCents !== 0 && (Object.keys(closedProfitByOutcome).length > 0 || closedProfitContributions.length > 0) && (
                <div className="mb-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Closed by outcome (non-zero):</span>
                  <ul className="mt-1 space-y-0.5 text-sm font-mono">
                    {Object.entries(closedProfitByOutcome)
                      .filter(([, c]) => c !== 0)
                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                      .map(([outcome, cents]) => (
                        <li key={outcome} className={cents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {outcome}: {formatPortfolio(cents, true)}
                        </li>
                      ))}
                  </ul>
                  {closedProfitContributions.length > 0 && (
                    <>
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mt-1">Top closed profit contributions:</span>
                      <ul className="mt-0.5 space-y-0.5 text-sm font-mono max-h-32 overflow-y-auto">
                        {closedProfitContributions.slice(0, 15).map((c, i) => (
                          <li key={i} className={c.closed_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            user {c.user_id ?? 'null'} · {c.outcome}: {formatPortfolio(c.closed_profit_cents, true)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              {systemTotalSettledCents !== 0 && (Object.keys(settledProfitByOutcome).length > 0 || settledProfitContributions.length > 0) && (
                <div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Settled by outcome (non-zero):</span>
                  <ul className="mt-1 space-y-0.5 text-sm font-mono">
                    {Object.entries(settledProfitByOutcome)
                      .filter(([, c]) => c !== 0)
                      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                      .map(([outcome, cents]) => (
                        <li key={outcome} className={cents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {outcome}: {formatPortfolio(cents, true)}
                        </li>
                      ))}
                  </ul>
                  {settledProfitContributions.length > 0 && (
                    <>
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mt-1">Top settled profit contributions:</span>
                      <ul className="mt-0.5 space-y-0.5 text-sm font-mono max-h-32 overflow-y-auto">
                        {settledProfitContributions.slice(0, 15).map((c, i) => (
                          <li key={i} className={c.settled_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            user {c.user_id ?? 'null'} · {c.outcome}: {formatPortfolio(c.settled_profit_cents, true)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
            </div>
            )}
          </div>
        )}

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {sortedLeaderboard.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No users.</p>
          ) : (
            sortedLeaderboard.map((row) => (
              <Card key={row.user_id}>
                <CardContent className="p-4">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{row.username}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Trades</span>
                    <span className="text-right font-medium">{row.trade_count}</span>
                    <span className="text-gray-500 dark:text-gray-400">Open orders</span>
                    <span className="text-right font-medium">{row.open_orders_count}</span>
                    <span className="text-gray-500 dark:text-gray-400">Shares traded</span>
                    <span className="text-right font-medium">{row.shares_traded}</span>
                    <span className="text-gray-500 dark:text-gray-400">Closed profit</span>
                    <span className={`text-right font-medium ${row.closed_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : row.closed_profit_cents < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatPortfolio(row.closed_profit_cents, true)}</span>
                    <span className="text-gray-500 dark:text-gray-400">Settled profit</span>
                    <span className={`text-right font-medium ${row.settled_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : row.settled_profit_cents < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatPortfolio(row.settled_profit_cents, true)}</span>
                    <span className="text-gray-500 dark:text-gray-400">Portfolio value (unrealized)</span>
                    <span className={`text-right font-medium ${row.portfolio_value_cents > 0 ? 'text-green-600 dark:text-green-400' : row.portfolio_value_cents < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{formatPortfolio(row.portfolio_value_cents, true)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Summary (all participants) — mobile: below cards */}
        {leaderboard.length > 0 && (() => {
          const totalUsers = leaderboard.reduce((s, r) => s + r.portfolio_value_cents, 0);
          const totalAll = totalUsers + unattributedCents;
          return (
            <div className="md:hidden rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 p-4">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Summary (all participants)</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span><span className="text-gray-600 dark:text-gray-400">Trades:</span> <span className="font-semibold">{leaderboard.reduce((s, r) => s + r.trade_count, 0)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">Open orders:</span> <span className="font-semibold">{leaderboard.reduce((s, r) => s + r.open_orders_count, 0)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">Shares traded:</span> <span className="font-semibold">{leaderboard.reduce((s, r) => s + r.shares_traded, 0)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">Closed profit (users):</span> <span className={`font-semibold ${leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0) > 0 ? 'text-green-600 dark:text-green-400' : leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0), true)}</span></span>
                {unattributedClosedCents !== 0 && (
                  <span><span className="text-gray-600 dark:text-gray-400">Closed profit (system):</span> <span className={`font-semibold ${unattributedClosedCents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPortfolio(unattributedClosedCents, true)}</span></span>
                )}
                <span><span className="text-gray-600 dark:text-gray-400">Closed profit total:</span> <span className={`font-semibold ${(leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0) + unattributedClosedCents) > 0 ? 'text-green-600 dark:text-green-400' : (leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0) + unattributedClosedCents) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0) + unattributedClosedCents, true)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">Settled profit (users):</span> <span className={`font-semibold ${leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0) > 0 ? 'text-green-600 dark:text-green-400' : leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0), true)}</span></span>
                {unattributedSettledCents !== 0 && (
                  <span><span className="text-gray-600 dark:text-gray-400">Settled profit (system):</span> <span className={`font-semibold ${unattributedSettledCents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPortfolio(unattributedSettledCents, true)}</span></span>
                )}
                <span><span className="text-gray-600 dark:text-gray-400">Settled profit total:</span> <span className={`font-semibold ${leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0) + unattributedSettledCents === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatPortfolio(leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0) + unattributedSettledCents, true)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">Portfolio (users, unrealized):</span> <span className={`font-semibold ${totalUsers > 0 ? 'text-green-600 dark:text-green-400' : totalUsers < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(totalUsers, true)}</span></span>
                {unattributedCents !== 0 && (
                  <span><span className="text-gray-600 dark:text-gray-400">Unattributed (unrealized):</span> <span className={`font-semibold ${unattributedCents > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPortfolio(unattributedCents, true)}</span></span>
                )}
                <span><span className="text-gray-600 dark:text-gray-400">Total (users + unattributed, unrealized):</span> <span className={`font-semibold ${totalAll === 0 ? 'text-gray-700 dark:text-gray-300' : totalAll > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPortfolio(totalAll, true)}</span></span>
                <span><span className="text-gray-600 dark:text-gray-400">System total (unrealized; should be $0):</span> <span className={`font-semibold ${systemTotalCents === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatPortfolio(systemTotalCents, true)}</span></span>
              </div>
            </div>
          );
        })()}

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="w-full min-w-[700px] border-collapse" aria-describedby="leaderboard-caption">
            <caption id="leaderboard-caption" className="sr-only">Admin leaderboard: per-user stats including trades, open orders, shares traded, closed profit, settled profit, and portfolio value</caption>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('username')} className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'username' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    User {sortBy === 'username' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('trade_count')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'trade_count' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Trades {sortBy === 'trade_count' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('open_orders_count')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'open_orders_count' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Open orders {sortBy === 'open_orders_count' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('shares_traded')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'shares_traded' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Shares traded {sortBy === 'shares_traded' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('closed_profit_cents')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'closed_profit_cents' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Closed profit {sortBy === 'closed_profit_cents' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('settled_profit_cents')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'settled_profit_cents' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Settled profit {sortBy === 'settled_profit_cents' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-xs font-bold text-gray-600 dark:text-gray-400">
                  <button type="button" onClick={() => handleSort('portfolio_value_cents')} className="inline-flex items-center gap-1 ml-auto hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded" aria-sort={sortBy === 'portfolio_value_cents' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    Portfolio value (unrealized) {sortBy === 'portfolio_value_cents' && (sortDir === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No users.
                  </td>
                </tr>
              ) : (
                sortedLeaderboard.map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{row.username}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.trade_count}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.open_orders_count}</td>
                    <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{row.shares_traded}</td>
                    <td className={`py-3 px-4 text-right font-medium ${row.closed_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : row.closed_profit_cents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{formatPortfolio(row.closed_profit_cents, true)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${row.settled_profit_cents > 0 ? 'text-green-600 dark:text-green-400' : row.settled_profit_cents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{formatPortfolio(row.settled_profit_cents, true)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${row.portfolio_value_cents > 0 ? 'text-green-600 dark:text-green-400' : row.portfolio_value_cents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{formatPortfolio(row.portfolio_value_cents, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {leaderboard.length > 0 && (() => {
              const totalTrades = leaderboard.reduce((s, r) => s + r.trade_count, 0);
              const totalOrders = leaderboard.reduce((s, r) => s + r.open_orders_count, 0);
              const totalShares = leaderboard.reduce((s, r) => s + r.shares_traded, 0);
              const totalClosed = leaderboard.reduce((s, r) => s + r.closed_profit_cents, 0);
              const totalSettled = leaderboard.reduce((s, r) => s + r.settled_profit_cents, 0);
              const totalClosedAll = totalClosed + unattributedClosedCents;
              const totalSettledAll = totalSettled + unattributedSettledCents;
              const totalUsers = leaderboard.reduce((s, r) => s + r.portfolio_value_cents, 0);
              const totalAll = totalUsers + unattributedCents;
              return (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 font-semibold">
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">All participants</td>
                    <td className="py-3 px-4 text-right">{totalTrades}</td>
                    <td className="py-3 px-4 text-right">{totalOrders}</td>
                    <td className="py-3 px-4 text-right">{totalShares}</td>
                    <td className={`py-3 px-4 text-right ${totalClosed > 0 ? 'text-green-600 dark:text-green-400' : totalClosed < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(totalClosed, true)}</td>
                    <td className={`py-3 px-4 text-right ${totalSettled > 0 ? 'text-green-600 dark:text-green-400' : totalSettled < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(totalSettled, true)}</td>
                    <td className={`py-3 px-4 text-right ${totalUsers > 0 ? 'text-green-600 dark:text-green-400' : totalUsers < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(totalUsers, true)}</td>
                  </tr>
                  {(unattributedClosedCents !== 0 || unattributedSettledCents !== 0 || unattributedCents !== 0) && (
                    <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 font-medium">
                      <td className="py-2 px-4 text-gray-600 dark:text-gray-400 text-xs">System (no user_id or deleted user)</td>
                      <td className="py-2 px-4 text-right">—</td>
                      <td className="py-2 px-4 text-right">—</td>
                      <td className="py-2 px-4 text-right">—</td>
                      <td className={`py-2 px-4 text-right ${unattributedClosedCents > 0 ? 'text-green-600 dark:text-green-400' : unattributedClosedCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{formatPortfolio(unattributedClosedCents, true)}</td>
                      <td className={`py-2 px-4 text-right ${unattributedSettledCents > 0 ? 'text-green-600 dark:text-green-400' : unattributedSettledCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{formatPortfolio(unattributedSettledCents, true)}</td>
                      <td className={`py-2 px-4 text-right ${unattributedCents > 0 ? 'text-green-600 dark:text-green-400' : unattributedCents < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{formatPortfolio(unattributedCents, true)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 font-medium">
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400 text-xs">Closed / settled total (closed may be non-zero)</td>
                    <td colSpan={3} className="py-2 px-4" />
                    <td className={`py-2 px-4 text-right font-semibold ${totalClosedAll > 0 ? 'text-green-600 dark:text-green-400' : totalClosedAll < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{formatPortfolio(totalClosedAll, true)}</td>
                    <td className={`py-2 px-4 text-right font-semibold ${totalSettledAll === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatPortfolio(totalSettledAll, true)}</td>
                    <td className="py-2 px-4" />
                  </tr>
                  <tr className="border-t border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 font-semibold">
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">Total (users + unattributed, unrealized)</td>
                    <td colSpan={5} className="py-3 px-4" />
                    <td className={`py-3 px-4 text-right ${totalAll === 0 ? 'text-gray-700 dark:text-gray-300' : totalAll > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatPortfolio(totalAll, true)}</td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 font-medium">
                    <td className="py-2 px-4 text-gray-600 dark:text-gray-400 text-xs">System total (unrealized; all positions; should be $0)</td>
                    <td colSpan={5} className="py-2 px-4" />
                    <td className={`py-2 px-4 text-right font-semibold ${systemTotalCents === 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{formatPortfolio(systemTotalCents, true)}</td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>
    </PullToRefresh>
  );
}
