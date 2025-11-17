// src/components/shared/MessageArea.tsx
import { memo, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';

// นำเข้า custom hooks
import { useMessagesList } from '@/components/shared/hooks/useMessagesList';
// นำเข้าคอมโพเนนต์ย่อย
import VirtualMessageList, { type VirtualMessageListRef } from '@/components/shared/VirtualMessageList';
import MessageLightbox from '@/components/shared/message/MessageLightbox';
import { Button } from '@/components/ui/button';

interface MessageAreaProps {
  messages: MessageDTO[];
  isLoadingHistory?: boolean;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  onLoadMore?: () => void; // ⬆️ Load more at top
  onLoadMoreAtBottom?: () => void; // ⬇️ Load more at bottom (for Jump context)
  currentUserId: string;
  activeConversationId: string;

  // เพิ่ม props สำหรับการจัดการข้อความ
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void; // ✅ Jump with memory check + API

  // state สำหรับการแก้ไขข้อความ
  editingMessageId?: string | null;
  editingContent?: string;
  onEditingContentChange?: (content: string) => void;
  onConfirmEdit?: (content?: string) => void;
  onCancelEdit?: () => void;
  isAdmin?: boolean;
}

export interface MessageAreaRef {
  scrollToMessage: (messageId: string) => void;
  scrollToBottom: (smooth?: boolean) => void;
}

/**
 * คอมโพเนนต์สำหรับแสดงพื้นที่ข้อความ
 * ใช้ useMessagesList hook เพื่อจัดการ scroll position และการแสดงผล
 */
const MessageArea = forwardRef<MessageAreaRef, MessageAreaProps>(({
  messages,
  isLoadingHistory = false,
  isBusinessView = true,
  isGroupChat = false,
  onLoadMore,
  onLoadMoreAtBottom,
  currentUserId,
  activeConversationId,
  // เพิ่ม props สำหรับการจัดการข้อความ
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
  onJumpToMessage,
  // state สำหรับการแก้ไขข้อความ
  editingMessageId,
  editingContent = '',
  onEditingContentChange,
  onConfirmEdit,
  onCancelEdit,
  isAdmin = false,
}, ref) => {
  // ใช้ custom hook เพื่อจัดการ logic
  const {
    // State
    lightboxImage,
    showScrollButton,
    newMessagesCount,
    sortedAndGroupedMessages,

    // Handlers
    formatTime,
    getMessageStatus,
    renderMessageStatus,
    openLightbox,
    closeLightbox,
    handleCopyMessage,

    // Business logic
    getFormattedSender,
    isOwnMessage
  } = useMessagesList(
    messages,
    currentUserId,
    activeConversationId,
    isLoadingHistory,
    onLoadMore,
    isBusinessView,
    isAdmin
  );

  // Ref สำหรับ VirtualMessageList
  const virtualListRef = useRef<VirtualMessageListRef>(null);

  // ✅ Direct scroll only (no memory check, no API call) to prevent infinite loop
  const handleScrollToMessage = useCallback((messageId: string) => {
    // This is called by handleJumpToMessage AFTER fetching/checking memory
    // So we just scroll directly without calling onJumpToMessage again
    virtualListRef.current?.scrollToMessage(messageId);
  }, []);

  // ✅ Scroll to bottom
  const handleScrollToBottom = useCallback((smooth = true) => {
    virtualListRef.current?.scrollToBottom(smooth);
  }, []);

  // Expose scrollToMessage and scrollToBottom functions via ref
  useImperativeHandle(ref, () => ({
    scrollToMessage: handleScrollToMessage,
    scrollToBottom: handleScrollToBottom
  }), [handleScrollToMessage, handleScrollToBottom]);

  // แสดงข้อความว่างเปล่า
  if (messages.length === 0 && !isLoadingHistory) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">ยังไม่มีข้อความ</p>
          <p className="text-sm text-muted-foreground">ส่งข้อความแรกเพื่อเริ่มการสนทนา</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      {/* Loading indicator */}
      {isLoadingHistory && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center py-4 bg-background/80">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Virtual Message List (Virtua with official pattern) */}
      <VirtualMessageList
        ref={virtualListRef}
        messages={sortedAndGroupedMessages}
        currentUserId={currentUserId}
        activeConversationId={activeConversationId}
        onLoadMore={onLoadMore}
        onLoadMoreAtBottom={onLoadMoreAtBottom}
        onReplyMessage={onReplyMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onResendMessage={onResendMessage}
        onImageClick={openLightbox}
        scrollToMessage={handleScrollToMessage}
        onJumpToMessage={onJumpToMessage}
        isBusinessView={isBusinessView}
        isGroupChat={isGroupChat}
        isAdmin={isAdmin}
        formatTime={formatTime}
        getMessageStatus={getMessageStatus}
        renderMessageStatus={renderMessageStatus}
        getFormattedSender={getFormattedSender}
        isOwnMessage={isOwnMessage}
        handleCopyMessage={handleCopyMessage}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        onEditingContentChange={onEditingContentChange}
        onConfirmEdit={onConfirmEdit}
        onCancelEdit={onCancelEdit}
      />

      {/* ปุ่มเลื่อนลงล่างสุด */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={() => virtualListRef.current?.scrollToBottom(true)}
            variant="secondary"
            size="sm"
            className="rounded-full shadow-md h-10 w-10 p-0 flex items-center justify-center"
          >
            <ArrowDown size={20} />
            {newMessagesCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                {newMessagesCount > 99 ? '99+' : newMessagesCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <MessageLightbox
          imageUrl={lightboxImage}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
});

MessageArea.displayName = 'MessageArea';

export default memo(MessageArea);