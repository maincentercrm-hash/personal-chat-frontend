/**
 * DateSeparator - Date divider between messages
 * Click to open date picker and jump to a specific date
 */

import { memo, useMemo, useState, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface DateSeparatorProps {
  /** Date string (ISO format) */
  date: string;
  /** Callback when a date is selected from picker */
  onDateSelect?: (date: string) => void;
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

export const DateSeparator = memo(function DateSeparator({
  date,
  onDateSelect,
}: DateSeparatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = useMemo(() => formatDateLabel(date), [date]);
  const selectedDate = useMemo(() => new Date(date), [date]);

  const handleDateSelect = useCallback((selected: Date | undefined) => {
    if (selected && onDateSelect) {
      // Format as YYYY-MM-DD
      const year = selected.getFullYear();
      const month = String(selected.getMonth() + 1).padStart(2, '0');
      const day = String(selected.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      onDateSelect(dateStr);
      setIsOpen(false);
    }
  }, [onDateSelect]);

  // If no onDateSelect, render as plain text (not clickable)
  if (!onDateSelect) {
    return (
      <div className="flex justify-center py-3">
        <span className="bg-[var(--bubble-system-bg)] text-[var(--bubble-system-text)] text-[13px] px-3 py-1 rounded-full">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-3">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'bg-[var(--bubble-system-bg)] text-[var(--bubble-system-text)] text-[13px] px-3 py-1 rounded-full',
              'hover:bg-accent hover:text-accent-foreground transition-colors',
              'cursor-pointer select-none'
            )}
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(d) => d > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

export default DateSeparator;
