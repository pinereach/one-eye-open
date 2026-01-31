import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const POLL_INTERVAL_MS = 50_000;
const STORAGE_KEY_PREFIX = 'trade_notifications_last_ack_';

interface TradeNotificationsContextValue {
  unreadCount: number;
  clearUnread: () => void;
}

const TradeNotificationsContext = createContext<TradeNotificationsContextValue | null>(null);

export function TradeNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastAckTradeIdRef = useRef<number | null>(null);
  const latestTradeIdRef = useRef<number>(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = user ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  const fetchAndUpdate = useCallback(async () => {
    if (!user) return;
    try {
      const { trades } = await api.getAllTrades(50);
      const latestId = trades?.[0]?.id ?? 0;
      latestTradeIdRef.current = latestId;

      let lastAck = lastAckTradeIdRef.current;
      if (lastAck === null && storageKey) {
        try {
          const stored = localStorage.getItem(storageKey);
          lastAck = stored !== null ? parseInt(stored, 10) : null;
          if (lastAck !== null && !Number.isNaN(lastAck)) {
            lastAckTradeIdRef.current = lastAck;
          }
        } catch {
          lastAck = null;
        }
      }

      if (lastAck === null || Number.isNaN(lastAck)) {
        lastAckTradeIdRef.current = latestId;
        setUnreadCount(0);
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, String(latestId));
          } catch {
            // ignore
          }
        }
        return;
      }

      const count = trades?.filter((t: { id: number }) => t.id > lastAck!).length ?? 0;
      setUnreadCount(count);
    } catch {
      // keep previous unreadCount on error
    }
  }, [user, storageKey]);

  useEffect(() => {
    if (!user || !storageKey) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      lastAckTradeIdRef.current = null;
      latestTradeIdRef.current = 0;
      setUnreadCount(0);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      const val = stored !== null ? parseInt(stored, 10) : null;
      lastAckTradeIdRef.current = Number.isNaN(val as number) ? null : val;
    } catch {
      lastAckTradeIdRef.current = null;
    }

    fetchAndUpdate();

    pollIntervalRef.current = setInterval(fetchAndUpdate, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user, storageKey, fetchAndUpdate]);

  const clearUnread = useCallback(() => {
    const latest = latestTradeIdRef.current;
    lastAckTradeIdRef.current = latest;
    setUnreadCount(0);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(latest));
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  const value: TradeNotificationsContextValue = {
    unreadCount,
    clearUnread,
  };

  return (
    <TradeNotificationsContext.Provider value={value}>
      {children}
    </TradeNotificationsContext.Provider>
  );
}

export function useTradeNotifications(): TradeNotificationsContextValue {
  const ctx = useContext(TradeNotificationsContext);
  if (!ctx) {
    throw new Error('useTradeNotifications must be used within a TradeNotificationsProvider');
  }
  return ctx;
}
