/**
 * MessageTime - Timestamp display component
 *
 * Features:
 * - Inline (float right in text)
 * - Block (separate line)
 * - With status icon
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface MessageTimeProps {
  /** Formatted time string (e.g., "14:30") */
  time: string;

  /** Is own message (affects color) */
  isOwn: boolean;

  /** Display mode */
  variant?: 'inline' | 'block';

  /** Additional class names */
  className?: string;
}

// ============================================
// Component
// ============================================

export const MessageTime = memo(function MessageTime({
  time,
  isOwn,
  variant = 'inline',
  className,
}: MessageTimeProps) {
  const baseClasses = cn(
    'text-[11px] leading-none whitespace-nowrap select-none',
    isOwn ? 'text-[var(--bubble-own-time)]' : 'text-[var(--bubble-other-time)]',
  );

  const variantClasses = cn(
    variant === 'inline' && 'float-right ml-2 mt-[3px]',
    variant === 'block' && 'text-right mt-1',
  );

  return (
    <span className={cn(baseClasses, variantClasses, className)}>
      {time}
    </span>
  );
});

export default MessageTime;
