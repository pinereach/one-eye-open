import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, enabled = true }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || refreshing) return;
      startY.current = e.touches[0].clientY;
      scrollTop.current = typeof document !== 'undefined' ? document.documentElement.scrollTop : 0;
    },
    [enabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || refreshing) return;
      const atTop = typeof document !== 'undefined' && document.documentElement.scrollTop <= 5;
      if (!atTop) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        const distance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(distance);
      }
    },
    [enabled, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || refreshing) return;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, refreshing, pullDistance, onRefresh]);

  return {
    pullDistance,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
