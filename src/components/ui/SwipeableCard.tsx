import { useState, useRef, ReactNode } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction,
  rightAction,
  className = '' 
}: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const threshold = 100; // Minimum swipe distance

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = currentX.current - startX.current;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setSwipeOffset(0);
    setIsDragging(false);
  };

  const showLeftAction = swipeOffset < -threshold / 2 && leftAction;
  const showRightAction = swipeOffset > threshold / 2 && rightAction;

  return (
    <div className="relative overflow-hidden">
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {leftAction && (
          <div className={`flex-1 bg-red-500 flex items-center justify-end pr-4 transition-opacity ${
            showLeftAction ? 'opacity-100' : 'opacity-0'
          }`}>
            {leftAction}
          </div>
        )}
        {rightAction && (
          <div className={`flex-1 bg-green-500 flex items-center justify-start pl-4 transition-opacity ${
            showRightAction ? 'opacity-100' : 'opacity-0'
          }`}>
            {rightAction}
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div
        className={`relative transition-transform touch-manipulation ${className}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
