/**
 * ScrollToBottom - Floating button to scroll to latest messages
 */

import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface ScrollToBottomProps {
  /** Show the button */
  visible: boolean;

  /** Number of new messages (badge) */
  newCount?: number;

  /** Click handler */
  onClick: () => void;
}

// ============================================
// Component
// ============================================

export const ScrollToBottom = memo(function ScrollToBottom({
  visible,
  newCount = 0,
  onClick,
}: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute bottom-4 right-4 z-10',
        'w-10 h-10 rounded-full',
        'bg-background border shadow-lg',
        'flex items-center justify-center',
        'hover:bg-accent transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary'
      )}
      aria-label="Scroll to bottom"
    >
      <ChevronDown className="w-5 h-5" />

      {/* New messages badge */}
      {newCount > 0 && (
        <span className={cn(
          'absolute -top-2 -right-2',
          'min-w-[20px] h-5 px-1.5',
          'bg-primary text-primary-foreground',
          'text-xs font-medium rounded-full',
          'flex items-center justify-center'
        )}>
          {newCount > 99 ? '99+' : newCount}
        </span>
      )}
    </button>
  );
});

export default ScrollToBottom;
