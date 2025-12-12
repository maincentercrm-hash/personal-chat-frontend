/**
 * DateSeparator - Date divider between messages
 */

import { memo, useMemo } from 'react';

// ============================================
// Props
// ============================================

interface DateSeparatorProps {
  /** Date string (ISO format) */
  date: string;
}

// ============================================
// Helpers
// ============================================

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today
  if (date.toDateString() === today.toDateString()) {
    return 'วันนี้';
  }

  // Yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'เมื่อวาน';
  }

  // This year - show day and month
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
    });
  }

  // Different year - show full date
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================
// Component
// ============================================

export const DateSeparator = memo(function DateSeparator({ date }: DateSeparatorProps) {
  const label = useMemo(() => formatDateLabel(date), [date]);

  return (
    <div className="flex justify-center py-3">
      <span className="bg-[var(--bubble-system-bg)] text-[var(--bubble-system-text)] text-[13px] px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
});

export default DateSeparator;
