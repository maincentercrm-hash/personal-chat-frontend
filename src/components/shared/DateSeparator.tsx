// src/components/shared/DateSeparator.tsx
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { th } from 'date-fns/locale';

interface DateSeparatorProps {
  date: Date | string;
  className?: string;
}

// ✅ Fixed height for Virtuoso height calculation (prevents scroll jump)
export const DATE_SEPARATOR_HEIGHT = 32;

/**
 * แสดงขั้นวันที่ระหว่างข้อความที่ส่งคนละวัน
 * แบบ static divider (ไม่ใช่ floating badge)
 */
export function DateSeparator({ date, className = '' }: DateSeparatorProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatDate = (d: Date): string => {
    if (isToday(d)) {
      return 'วันนี้';
    }
    if (isYesterday(d)) {
      return 'เมื่อวาน';
    }
    if (isThisYear(d)) {
      return format(d, 'EEEE d MMMM', { locale: th });
    }
    return format(d, 'EEEE d MMMM yyyy', { locale: th });
  };

  return (
    <div className={`flex items-center py-2 px-4 ${className}`} style={{ height: DATE_SEPARATOR_HEIGHT }}>
      <div className="flex-1 border-t border-border" />
      <span className="px-3 text-xs font-medium text-muted-foreground bg-background">
        {formatDate(dateObj)}
      </span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

/**
 * Helper function: ตรวจสอบว่าสองวันที่อยู่คนละวันหรือไม่
 */
export function isDifferentDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

export default DateSeparator;
