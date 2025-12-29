/**
 * MessageBubble - Telegram-style bubble component
 *
 * Features:
 * - Rounded corners with tail
 * - Green (own) / White (other) background
 * - Connected bubbles for grouped messages
 * - Media variant (no padding)
 */

import { memo } from 'react';
import type { ReactNode } from 'react';
import type { MessagePosition } from '../MessageList/types';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface MessageBubbleProps {
  /** Is own message (right side, green) */
  isOwn: boolean;

  /** Position in message group */
  position: MessagePosition;

  /** Has media content (no padding, different radius) */
  hasMedia?: boolean;

  /** Children content */
  children: ReactNode;

  /** Additional class names */
  className?: string;

  /** Click handler */
  onClick?: () => void;
}

// ============================================
// Component
// ============================================

export const MessageBubble = memo(function MessageBubble({
  isOwn,
  position,
  hasMedia = false,
  children,
  className,
  onClick,
}: MessageBubbleProps) {
  // Base classes
  const baseClasses = cn(
    'relative max-w-[420px] min-w-[80px]',
    'transition-colors duration-150',
  );

  // Background color
  const bgClasses = cn(
    isOwn
      ? 'bg-[var(--bubble-own-bg)] text-[var(--bubble-own-text)]'
      : 'bg-[var(--bubble-other-bg)] text-[var(--bubble-other-text)]',
  );

  // Shadow style for other messages (light mode)
  const shadowStyle = !isOwn ? { boxShadow: 'var(--bubble-other-shadow)' } : undefined;

  // Padding (none for media)
  const paddingClasses = hasMedia
    ? ''
    : 'px-[6px] py-[6px]';

  // Border radius based on position
  // Telegram-style: connected corners are smaller
  const radiusClasses = getRadiusClasses(isOwn, position, hasMedia);

  // Overflow for media
  const overflowClasses = hasMedia ? 'overflow-hidden' : '';

  return (
    <div
      className={cn(
        baseClasses,
        bgClasses,
        paddingClasses,
        radiusClasses,
        overflowClasses,
        className,
      )}
      style={shadowStyle}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

// ============================================
// Helper: Get border radius classes
// ============================================

function getRadiusClasses(
  isOwn: boolean,
  position: MessagePosition,
  hasMedia: boolean
): string {
  // Base radius
  const baseRadius = hasMedia ? 'rounded-[14px]' : 'rounded-[16px]';
  const smallRadius = '!rounded-[6px]';

  // Single message - all corners rounded
  if (position === 'single') {
    if (isOwn) {
      // Own: tail at bottom-right
      return cn(baseRadius, `${smallRadius.replace('!rounded', '!rounded-br')}`);
    } else {
      // Other: tail at bottom-left
      return cn(baseRadius, '!rounded-bl-[6px]');
    }
  }

  // First in group - tail, connected bottom
  if (position === 'first') {
    if (isOwn) {
      return cn(baseRadius, '!rounded-br-[6px]');
    } else {
      return cn(baseRadius, '!rounded-bl-[6px]');
    }
  }

  // Middle - connected top and bottom
  if (position === 'middle') {
    if (isOwn) {
      return cn(baseRadius, '!rounded-tr-[6px] !rounded-br-[6px]');
    } else {
      return cn(baseRadius, '!rounded-tl-[6px] !rounded-bl-[6px]');
    }
  }

  // Last - connected top only
  if (position === 'last') {
    if (isOwn) {
      return cn(baseRadius, '!rounded-tr-[6px]');
    } else {
      return cn(baseRadius, '!rounded-tl-[6px]');
    }
  }

  return baseRadius;
}

export default MessageBubble;
