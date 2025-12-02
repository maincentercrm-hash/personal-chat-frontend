// src/components/shared/DateBadge.tsx
// Telegram-style floating date badge
// Shows current date context while scrolling (sticky header)

import { memo } from 'react';

interface DateBadgeProps {
  date: string; // "วันนี้", "เมื่อวาน", "23 พ.ย. 2567"
}

/**
 * DateBadge Component - Telegram-style floating date indicator
 *
 * Features:
 * - Floating badge at top center
 * - Semi-transparent with backdrop blur
 * - Smooth transition when date changes
 * - Dark mode support
 *
 * Usage:
 * <DateBadge date="วันนี้" />
 */
const DateBadge = ({ date }: DateBadgeProps) => {
  return (
    <div
      className="
        bg-gray-800/80 dark:bg-gray-700/80
        backdrop-blur-sm
        px-2 py-0.5
        rounded-full
        leading-none
        shadow-lg
        transition-all duration-200 ease-in-out
        pointer-events-none
      "
      role="status"
      aria-live="polite"
      aria-label={`กำลังดูข้อความจาก${date}`}
    >
      <span className="text-[10px] font-medium text-white whitespace-nowrap">
        {date}
      </span>
    </div>
  );
};

export default memo(DateBadge);
