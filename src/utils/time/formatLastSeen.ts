/**
 * Format last seen timestamp to human-readable text
 *
 * @param lastActiveTime - The last active timestamp
 * @returns Formatted string like "Active now", "Active 5m ago", etc.
 *
 * @example
 * formatLastSeen(new Date()) // "Active now"
 * formatLastSeen(new Date(Date.now() - 5 * 60 * 1000)) // "Active 5m ago"
 * formatLastSeen(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "Active 2h ago"
 */
export const formatLastSeen = (lastActiveTime: Date | null | undefined): string => {
  if (!lastActiveTime) return 'Offline';

  const now = new Date();
  const diff = now.getTime() - lastActiveTime.getTime();

  // Convert to seconds
  const seconds = Math.floor(diff / 1000);

  // Negative diff means future date (shouldn't happen, but handle it)
  if (seconds < 0) return 'Active now';

  // Less than 1 minute
  if (seconds < 60) return 'Active now';

  // Convert to minutes
  const minutes = Math.floor(seconds / 60);

  // Less than 1 hour
  if (minutes < 60) return `Active ${minutes}m ago`;

  // Convert to hours
  const hours = Math.floor(minutes / 60);

  // Less than 24 hours
  if (hours < 24) return `Active ${hours}h ago`;

  // Convert to days
  const days = Math.floor(hours / 24);

  // Yesterday
  if (days === 1) return 'Active yesterday';

  // Less than a week
  if (days < 7) return `Active ${days}d ago`;

  // More than a week - show date
  return `Last seen ${lastActiveTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`;
};

/**
 * Format last seen timestamp to short format (for mobile)
 *
 * @param lastActiveTime - The last active timestamp
 * @returns Short formatted string like "Now", "5m", "2h", etc.
 *
 * @example
 * formatLastSeenShort(new Date()) // "Now"
 * formatLastSeenShort(new Date(Date.now() - 5 * 60 * 1000)) // "5m"
 */
export const formatLastSeenShort = (lastActiveTime: Date | null | undefined): string => {
  if (!lastActiveTime) return 'Off';

  const now = new Date();
  const diff = now.getTime() - lastActiveTime.getTime();

  const seconds = Math.floor(diff / 1000);

  if (seconds < 0) return 'Now';
  if (seconds < 60) return 'Now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;

  return `${Math.floor(days / 7)}w`;
};

/**
 * Parse last seen string (ISO 8601) or Date object
 * Helper function to handle both string and Date inputs
 */
export const parseLastSeen = (lastSeen: string | Date | null | undefined): Date | null => {
  if (!lastSeen) return null;

  if (lastSeen instanceof Date) {
    return lastSeen;
  }

  try {
    const date = new Date(lastSeen);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};
