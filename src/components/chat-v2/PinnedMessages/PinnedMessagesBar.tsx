/**
 * PinnedMessagesBar - แถบเล็กๆ ด้านบน chat แสดงจำนวน pinned messages
 * คลิกเพื่อเปิด PinnedMessagesPanel
 */

import { memo, useEffect } from 'react';
import { Pin, ChevronRight } from 'lucide-react';
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore';
import { cn } from '@/lib/utils';

interface PinnedMessagesBarProps {
  conversationId: string;
  onShowPanel: () => void;
  className?: string;
}

export const PinnedMessagesBar = memo(function PinnedMessagesBar({
  conversationId,
  onShowPanel,
  className
}: PinnedMessagesBarProps) {
  const { pinnedMessages, fetchPinnedMessages } = usePinnedMessageStore();
  const pinnedCount = pinnedMessages[conversationId]?.length || 0;

  // Fetch pinned messages เมื่อ conversation เปลี่ยน
  useEffect(() => {
    if (conversationId) {
      fetchPinnedMessages(conversationId);
    }
  }, [conversationId, fetchPinnedMessages]);

  // ไม่แสดงถ้าไม่มี pinned messages
  if (pinnedCount === 0) {
    return null;
  }

  return (
    <button
      onClick={onShowPanel}
      className={cn(
        'w-full flex items-center justify-between px-4 py-2',
        'bg-muted/50 hover:bg-muted/80 transition-colors',
        'border-b border-border',
        'text-sm text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Pin className="w-4 h-4" />
        <span>
          {pinnedCount} ข้อความที่ปักหมุด
        </span>
      </div>
      <ChevronRight className="w-4 h-4" />
    </button>
  );
});

export default PinnedMessagesBar;
