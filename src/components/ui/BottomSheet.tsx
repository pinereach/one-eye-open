import { useEffect, useRef, useCallback, ReactNode } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const getVisiblePanel = useCallback(() => {
    const mobile = mobilePanelRef.current;
    const desktop = desktopPanelRef.current;
    if (mobile && desktop) {
      const mobileRect = mobile.getBoundingClientRect();
      const desktopRect = desktop.getBoundingClientRect();
      if (mobileRect.width > 0 && mobileRect.height > 0) return mobile;
      if (desktopRect.width > 0 && desktopRect.height > 0) return desktop;
    }
    return mobile ?? desktop;
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      previousActiveRef.current = document.activeElement as HTMLElement | null;
    } else {
      document.body.style.overflow = '';
      if (previousActiveRef.current && typeof previousActiveRef.current.focus === 'function') {
        previousActiveRef.current.focus();
        previousActiveRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = getVisiblePanel();
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent != null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, getVisiblePanel]);

  useEffect(() => {
    if (!isOpen) return;
    const panel = getVisiblePanel();
    if (!panel) return;
    const focusable = panel.querySelector<HTMLElement>(FOCUSABLE);
    const timer = requestAnimationFrame(() => {
      if (focusable) focusable.focus();
    });
    return () => cancelAnimationFrame(timer);
  }, [isOpen, getVisiblePanel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Mobile: Bottom Sheet */}
      <div ref={mobilePanelRef} className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto safe-area-bottom" role="dialog" aria-modal="true">
        {/* Handle */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 pt-2 pb-2 flex justify-center">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="px-3 pt-3 pb-24">
          {children}
        </div>
      </div>

      {/* Desktop: Centered Modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center p-4" aria-hidden="true">
        <div 
          ref={desktopPanelRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          {title && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
