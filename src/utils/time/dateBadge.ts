// src/utils/time/dateBadge.ts
// Date badge formatting utilities

/**
 * Format date for date badge display
 * Returns: "วันนี้", "เมื่อวาน", or dd/mm/yyyy
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted date string for badge
 *
 * @example
 * formatDateBadge('2024-12-01T10:30:00Z') // "วันนี้"
 * formatDateBadge('2024-11-30T10:30:00Z') // "เมื่อวาน"
 * formatDateBadge('2024-11-23T10:30:00Z') // "23/11/2024"
 */
export const formatDateBadge = (timestamp: string): string => {
  const msgDate = new Date(timestamp);
  const today = new Date();

  // Reset time to midnight for accurate date comparison (use local timezone)
  const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Calculate difference in days
  const diffTime = todayOnly.getTime() - msgDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Debug log
  console.log('[DateBadge] Format:', {
    timestamp,
    msgDate: msgDate.toISOString(),
    msgDateOnly: msgDateOnly.toDateString(),
    todayOnly: todayOnly.toDateString(),
    diffDays
  });

  if (diffDays === 0) {
    return 'วันนี้';
  } else if (diffDays === 1) {
    return 'เมื่อวาน';
  } else {
    // Format as dd/mm/yyyy
    const day = msgDate.getDate().toString().padStart(2, '0');
    const month = (msgDate.getMonth() + 1).toString().padStart(2, '0');
    const year = msgDate.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

/**
 * Get date key for grouping messages
 * Used to detect when date changes between messages
 *
 * @param timestamp - ISO timestamp string
 * @returns Date key in format "YYYY-MM-DD"
 */
export const getDateKey = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // "2024-12-01"
};

/**
 * Check if two messages are on different dates
 *
 * @param timestamp1 - First message timestamp
 * @param timestamp2 - Second message timestamp
 * @returns true if messages are on different dates
 */
export const isDifferentDate = (timestamp1: string, timestamp2: string): boolean => {
  return getDateKey(timestamp1) !== getDateKey(timestamp2);
};
