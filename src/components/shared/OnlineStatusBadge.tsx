import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusBadgeProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showOffline?: boolean;
  className?: string;
  withPulse?: boolean;
}

/**
 * Online status badge component
 * Shows a colored dot to indicate user's online status
 *
 * @example
 * <OnlineStatusBadge isOnline={true} size="md" />
 * // Green dot with pulse animation
 *
 * <OnlineStatusBadge isOnline={false} showOffline={true} />
 * // Gray dot
 */
export const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({
  isOnline,
  size = 'md',
  showOffline = false,
  className,
  withPulse = true
}) => {
  // Don't render if offline and showOffline is false
  if (!isOnline && !showOffline) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colorClasses = isOnline
    ? 'bg-green-500'
    : 'bg-gray-400';

  return (
    <span
      className={cn(
        'relative inline-block rounded-full ring-2 ring-white dark:ring-gray-900',
        sizeClasses[size],
        colorClasses,
        className
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    >
      {/* Pulse animation for online status */}
      {isOnline && withPulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full bg-green-500 animate-ping-slow opacity-75',
            sizeClasses[size]
          )}
        />
      )}
    </span>
  );
};

export default OnlineStatusBadge;
