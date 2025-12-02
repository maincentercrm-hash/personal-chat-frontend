// src/hooks/useLongPress.ts
// Custom hook for detecting long press (for entering message selection mode)

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  threshold?: number; // milliseconds
}

interface UseLongPressReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Custom hook for detecting long press gestures
 *
 * @param options.onLongPress - Callback when long press detected
 * @param options.onClick - Optional callback for regular click
 * @param options.threshold - Long press duration in ms (default: 500ms)
 *
 * @example
 * const longPressProps = useLongPress({
 *   onLongPress: () => console.log('Long pressed!'),
 *   onClick: () => console.log('Clicked!'),
 *   threshold: 500
 * });
 *
 * return <div {...longPressProps}>Press me</div>
 */
export function useLongPress({
  onLongPress,
  onClick,
  threshold = 500,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Start long press timer
  const startPressTimer = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  // Clear long press timer
  const clearPressTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Handle press end
  const handlePressEnd = useCallback(() => {
    clearPressTimer();

    // If not long press, trigger onClick
    if (!isLongPressRef.current && onClick) {
      onClick();
    }

    isLongPressRef.current = false;
  }, [clearPressTimer, onClick]);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle left click
    if (e.button === 0) {
      startPressTimer();
    }
  }, [startPressTimer]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      handlePressEnd();
    }
  }, [handlePressEnd]);

  const onMouseLeave = useCallback(() => {
    clearPressTimer();
    isLongPressRef.current = false;
  }, [clearPressTimer]);

  // Touch handlers
  const onTouchStart = useCallback((_e: React.TouchEvent) => {
    startPressTimer();
  }, [startPressTimer]);

  const onTouchEnd = useCallback((_e: React.TouchEvent) => {
    handlePressEnd();
  }, [handlePressEnd]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
  };
}
