import React from 'react';
import { formatTypingText } from '@/utils/typing/formatTypingText';
import { AnimatedDots } from './AnimatedDots';
import type { TypingUser } from '@/types/typing.types';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
  showDots?: boolean;
}

/**
 * Typing indicator component
 * Shows "User is typing..." with animated dots
 *
 * @example
 * <TypingIndicator typingUsers={[{user_id: '1', display_name: 'John'}]} />
 * // "John is typing..."
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  className = '',
  showDots = true
}) => {
  // Don't render if no users are typing
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  const text = formatTypingText(typingUsers);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-4 py-1 text-xs text-muted-foreground/70',
        'animate-fade-in',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <span>{text}</span>
      {showDots && <AnimatedDots />}
    </div>
  );
};

export default TypingIndicator;
