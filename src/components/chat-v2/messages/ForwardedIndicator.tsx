/**
 * ForwardedIndicator - Shows "Forwarded from..." label
 *
 * Telegram-style:
 * - "Forwarded from" text
 * - Original sender name (clickable)
 */

import { memo } from 'react';
import { Forward } from 'lucide-react';
import type { ForwardedFromDTO } from '@/types/message.types';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface ForwardedIndicatorProps {
  /** Forwarded from info */
  forwardedFrom: ForwardedFromDTO;

  /** Is this in own message bubble */
  isOwn: boolean;
}

// ============================================
// Component
// ============================================

export const ForwardedIndicator = memo(function ForwardedIndicator({
  forwardedFrom,
  isOwn,
}: ForwardedIndicatorProps) {
  const senderName = forwardedFrom.sender_name || 'Unknown';

  return (
    <div
      className={cn(
        'flex items-center gap-1 mb-1',
        'text-[12px]',
        isOwn ? 'text-[var(--forward-text)]' : 'text-[var(--forward-text)]'
      )}
    >
      <Forward size={12} className="flex-shrink-0" />
      <span>ส่งต่อจาก</span>
      <span
        className={cn(
          'font-medium cursor-pointer hover:underline',
          'text-[var(--forward-name)]'
        )}
      >
        {senderName}
      </span>
    </div>
  );
});

export default ForwardedIndicator;
