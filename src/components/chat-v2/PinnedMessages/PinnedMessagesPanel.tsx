/**
 * PinnedMessagesPanel - Panel แสดงรายการ pinned messages
 * เปิดจาก PinnedMessagesBar หรือจาก conversation header
 */

import { memo, useEffect } from 'react';
import { X, Pin, MessageSquare, User, Globe } from 'lucide-react';
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import type { PinnedMessageDTO } from '@/types/pinned-message.types';

interface PinnedMessagesPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onMessageClick?: (messageId: string) => void;
  className?: string;
}

interface PinnedMessageItemProps {
  pinnedMessage: PinnedMessageDTO;
  conversationId: string;
  currentUserId: string;
  onUnpin: () => void;
  onClick?: () => void;
}

const PinnedMessageItem = memo(function PinnedMessageItem({
  pinnedMessage,
  conversationId,
  currentUserId,
  onUnpin,
  onClick
}: PinnedMessageItemProps) {
  const { unpinMessage, isLoading } = usePinnedMessageStore();
  const message = pinnedMessage.message;

  // ตรวจสอบว่าเป็นข้อความของตัวเองหรือไม่
  const isOwnMessage = message?.sender_id === currentUserId;

  // ตรวจสอบว่าเป็นคนที่ปักหมุดหรือไม่
  const isPinnedByMe = pinnedMessage.user_id === currentUserId;

  // แสดงปุ่มยกเลิกปักหมุดเฉพาะ: personal pin หรือ public pin ที่ตัวเองปักหมุด
  const canUnpin = pinnedMessage.pin_type === 'personal' || isPinnedByMe;

  const handleUnpin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await unpinMessage(conversationId, pinnedMessage.message_id, pinnedMessage.pin_type);
    onUnpin();
  };

  // สร้าง preview ของข้อความ
  const getMessagePreview = () => {
    if (!message) return 'ข้อความ';
    switch (message.message_type) {
      case 'text':
        return message.content || '';
      case 'image':
        return '🖼️ รูปภาพ';
      case 'video':
        return '🎬 วิดีโอ';
      case 'file':
        return `📎 ${message.file_name || 'ไฟล์'}`;
      case 'sticker':
        return '🎨 สติกเกอร์';
      case 'album':
        return `🖼️ อัลบั้ม (${message.album_files?.length || 0} รายการ)`;
      default:
        return message.content || 'ข้อความ';
    }
  };

  const timeAgo = pinnedMessage.pinned_at
    ? formatDistanceToNow(new Date(pinnedMessage.pinned_at), { addSuffix: true, locale: th })
    : '';

  // Get sender name from message
  const senderName = message?.sender_info?.display_name ||
    message?.sender_name ||
    pinnedMessage.pinned_by?.display_name ||
    'ผู้ใช้';

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex w-full group cursor-pointer',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex flex-col max-w-[85%] p-3 rounded-2xl relative',
          'hover:shadow-md transition-shadow',
          isOwnMessage
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted rounded-bl-md'
        )}
      >
        {/* Header: Pin type + Sender name + Time */}
        <div className={cn(
          'flex items-center gap-2 text-xs mb-1',
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {/* Pin type icon */}
          <div title={pinnedMessage.pin_type === 'public' ? 'ทุกคนเห็น' : 'เห็นแค่ตัวเอง'}>
            {pinnedMessage.pin_type === 'public' ? (
              <Globe className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
          </div>
          <span className="font-medium">{isOwnMessage ? 'คุณ' : senderName}</span>
          {timeAgo && <span>• {timeAgo}</span>}
        </div>

        {/* Message content - รองรับการเว้นบรรทัด */}
        <p className={cn(
          'text-sm break-words whitespace-pre-wrap',
          isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {getMessagePreview()}
        </p>

        {/* Unpin button - แสดงเฉพาะคนที่ปักหมุด */}
        {canUnpin && (
          <button
            onClick={handleUnpin}
            disabled={isLoading}
            className={cn(
              'absolute -top-2 p-1.5 rounded-full',
              'bg-destructive text-white shadow-md',
              'hover:bg-destructive/90 active:scale-95 transition-all',
              isLoading && 'opacity-50 cursor-not-allowed',
              isOwnMessage ? '-left-2' : '-right-2'
            )}
            title="เลิกปักหมุด"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
});

export const PinnedMessagesPanel = memo(function PinnedMessagesPanel({
  conversationId,
  isOpen,
  onClose,
  onMessageClick,
  className
}: PinnedMessagesPanelProps) {
  const { pinnedMessages, fetchPinnedMessages, isLoading } = usePinnedMessageStore();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?.id || '';
  const messages = pinnedMessages[conversationId] || [];

  // Fetch เมื่อ panel เปิด
  useEffect(() => {
    if (isOpen && conversationId) {
      fetchPinnedMessages(conversationId);
    }
  }, [isOpen, conversationId, fetchPinnedMessages]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col',
        'bg-background',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Pin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">ข้อความที่ปักหมุด</h2>
          <span className="text-sm text-muted-foreground">
            ({messages.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p>ไม่มีข้อความที่ปักหมุด</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((pinnedMessage) => (
              <PinnedMessageItem
                key={pinnedMessage.id}
                pinnedMessage={pinnedMessage}
                conversationId={conversationId}
                currentUserId={currentUserId}
                onUnpin={() => {}}
                onClick={() => {
                  onMessageClick?.(pinnedMessage.message_id);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default PinnedMessagesPanel;
