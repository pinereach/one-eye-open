import { ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  /** Only enable on mobile (viewport < 768px). Default true. */
  mobileOnly?: boolean;
}

export function PullToRefresh({ onRefresh, children, className = '', mobileOnly = true }: PullToRefreshProps) {
  const {
    pullDistance,
    refreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh({
    onRefresh,
    enabled: true,
  });

  const showIndicator = (pullDistance > 0 || refreshing) && mobileOnly;

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showIndicator && (
        <div className="md:hidden absolute left-0 right-0 top-0 flex justify-center pt-2 pb-1 z-10 pointer-events-none">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium">
            {refreshing ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Refreshing…</span>
              </>
            ) : (
              <span>{pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}</span>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
