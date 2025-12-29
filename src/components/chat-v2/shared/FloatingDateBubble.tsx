/**
 * FloatingDateBubble - Floating date indicator with date picker
 * Shows current date while scrolling, click to jump to a specific date
 */

import { memo, useState, useCallback } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FloatingDateBubbleProps {
  /** Current visible date (ISO string) */
  currentDate: string | null;
  /** Whether the bubble is visible */
  visible: boolean;
  /** Callback when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Optional className */
  className?: string;
}

/**
 * Format date for display
 */
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
      month: 'short',
    });
  }

  // Different year - show full date
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const FloatingDateBubble = memo(function FloatingDateBubble({
  currentDate,
  visible,
  onDateSelect,
  className,
}: FloatingDateBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setIsOpen(false);
    }
  }, [onDateSelect]);

  if (!visible || !currentDate) {
    return null;
  }

  const label = formatDateLabel(currentDate);
  const selectedDate = new Date(currentDate);

  return (
    <div
      className={cn(
        'absolute top-2 left-1/2 -translate-x-1/2 z-40',
        'transition-all duration-200',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
        className
      )}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'bg-background/95 backdrop-blur-sm',
              'border border-border shadow-lg',
              'text-sm font-medium',
              'hover:bg-accent transition-colors',
              'cursor-pointer select-none'
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

export default FloatingDateBubble;
