import { Link } from 'react-router-dom';
import { useTradeNotifications } from '../../contexts/TradeNotificationsContext';

export function TradeNotificationBell() {
  const { unreadCount, clearUnread } = useTradeNotifications();

  const badgeLabel = unreadCount >= 10 ? '9+' : String(unreadCount);
  const ariaLabel = unreadCount > 0 ? `${unreadCount} new trades` : 'Trade notifications';

  return (
    <Link
      to="/trades"
      onClick={() => clearUnread()}
      className="relative p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={ariaLabel}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold px-1"
          aria-hidden="true"
        >
          {badgeLabel}
        </span>
      )}
    </Link>
  );
}
