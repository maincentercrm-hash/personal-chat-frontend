// src/components/shared/ScrollToBottomButton.tsx
import { memo } from 'react';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToBottomButtonProps {
  /** แสดงปุ่มหรือไม่ */
  visible: boolean;
  /** จำนวนข้อความใหม่ที่ยังไม่ได้อ่าน */
  newMessagesCount?: number;
  /** Callback เมื่อคลิกปุ่ม */
  onClick: () => void;
  /** Custom className */
  className?: string;
  /** ตำแหน่งของปุ่ม (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-center';
}

/**
 * ปุ่ม Scroll to Bottom พร้อม badge แสดงจำนวนข้อความใหม่
 *
 * Features:
 * - แสดง/ซ่อนด้วย animation fade + slide
 * - แสดง badge จำนวนข้อความใหม่
 * - รองรับ dark mode
 * - Responsive size
 */
export const ScrollToBottomButton = memo(({
  visible,
  newMessagesCount = 0,
  onClick,
  className,
  position = 'bottom-right'
}: ScrollToBottomButtonProps) => {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2'
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out",
        positionClasses[position],
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <Button
        onClick={onClick}
        variant="secondary"
        size="icon"
        className={cn(
          "rounded-full shadow-lg hover:shadow-xl",
          "h-12 w-12 p-0",
          "bg-background/95 backdrop-blur-sm",
          "border border-border/50",
          "hover:scale-110 active:scale-95",
          "transition-all duration-200"
        )}
        aria-label="Scroll to bottom"
      >
        <ArrowDown size={20} className="text-foreground" />

        {/* Badge แสดงจำนวนข้อความใหม่ */}
        {newMessagesCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1",
              "bg-primary text-primary-foreground",
              "rounded-full",
              "min-w-[20px] h-[20px] px-1.5",
              "flex items-center justify-center",
              "text-[10px] font-bold",
              "shadow-md",
              "animate-in zoom-in-50 duration-200"
            )}
          >
            {newMessagesCount > 99 ? '99+' : newMessagesCount}
          </span>
        )}
      </Button>
    </div>
  );
});

ScrollToBottomButton.displayName = 'ScrollToBottomButton';
