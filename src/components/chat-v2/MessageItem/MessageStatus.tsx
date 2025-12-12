/**
 * MessageStatus - Read/Delivered/Sent status icons
 *
 * Telegram-style:
 * - Single check: Sent
 * - Double check (gray): Delivered
 * - Double check (blue): Read
 */

import { memo } from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// ============================================
// Props
// ============================================

interface MessageStatusProps {
  /** Status type */
  status: MessageStatusType;

  /** Additional class names */
  className?: string;
}

// ============================================
// Component
// ============================================

export const MessageStatus = memo(function MessageStatus({
  status,
  className,
}: MessageStatusProps) {
  const baseClasses = cn(
    'inline-flex items-center ml-1',
    className,
  );

  const iconSize = 14;

  switch (status) {
    case 'sending':
      return (
        <span className={cn(baseClasses, 'text-[var(--status-sent)]')}>
          <Clock size={iconSize} className="animate-pulse" />
        </span>
      );

    case 'sent':
      return (
        <span className={cn(baseClasses, 'text-[var(--status-sent)]')}>
          <Check size={iconSize} />
        </span>
      );

    case 'delivered':
      return (
        <span className={cn(baseClasses, 'text-[var(--status-delivered)]')}>
          <CheckCheck size={iconSize} />
        </span>
      );

    case 'read':
      return (
        <span className={cn(baseClasses, 'text-[var(--status-read)]')}>
          <CheckCheck size={iconSize} />
        </span>
      );

    case 'failed':
      return (
        <span className={cn(baseClasses, 'text-red-500')}>
          <AlertCircle size={iconSize} />
        </span>
      );

    default:
      return null;
  }
});

// ============================================
// Helper: Get status from MessageDTO
// ============================================

export function getMessageStatus(
  message: { status?: string; is_read?: boolean; is_deleted?: boolean },
  isOwn: boolean
): MessageStatusType | null {
  // Only show status for own messages
  if (!isOwn) return null;

  // Deleted messages don't show status
  if (message.is_deleted) return null;

  // Use explicit status if available
  if (message.status) {
    return message.status as MessageStatusType;
  }

  // Fallback to is_read
  if (message.is_read) return 'read';

  return 'sent';
}

export default MessageStatus;
