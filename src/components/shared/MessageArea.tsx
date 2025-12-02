// src/components/shared/MessageArea.tsx
import { memo, forwardRef, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import type { MessageDTO } from '@/types/message.types';

// นำเข้า custom hooks
import { useMessagesList } from '@/components/shared/hooks/useMessagesList';
import { useTypingIndicator } from '@/hooks/useTypingIndicator'; // 🆕 เพิ่ม typing indicator
// นำเข้าคอมโพเนนต์ย่อย
import VirtualMessageList, { type VirtualMessageListRef } from '@/components/shared/VirtualMessageList';
import MessageLightbox from '@/components/shared/message/MessageLightbox';
import { AlbumLightboxV2 } from '@/components/shared/AlbumLightboxV2';
import { TypingIndicator } from '@/components/shared/TypingIndicator'; // 🆕 เพิ่ม
import MessageSelectionToolbar from '@/components/shared/MessageSelectionToolbar';
import ForwardMessageDialog from '@/components/shared/ForwardMessageDialog';
import { MessageSelectionProvider, useMessageSelection } from '@/contexts/MessageSelectionContext';
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
  isAdmin = false,
}, ref) => {
  // ใช้ custom hook เพื่อจัดการ logic
  const {
    // State
    lightboxImage,
    albumLightbox,
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

  // 🆕 Typing indicator hook
  const { typingUsers } = useTypingIndicator({
    conversationId: activeConversationId,
    currentUserId
  });

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
    <MessageSelectionProvider>
      <MessageAreaContent
        virtualListRef={virtualListRef}
        sortedAndGroupedMessages={sortedAndGroupedMessages}
        currentUserId={currentUserId}
        activeConversationId={activeConversationId}
        isLoadingHistory={isLoadingHistory}
        onLoadMore={onLoadMore}
        onLoadMoreAtBottom={onLoadMoreAtBottom}
        onReplyMessage={onReplyMessage}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onResendMessage={onResendMessage}
        openLightbox={openLightbox}
        handleScrollToMessage={handleScrollToMessage}
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
        showScrollButton={showScrollButton}
        newMessagesCount={newMessagesCount}
        typingUsers={typingUsers}
        lightboxImage={lightboxImage}
        albumLightbox={albumLightbox}
        closeLightbox={closeLightbox}
      />
    </MessageSelectionProvider>
  );
});

MessageArea.displayName = 'MessageArea';

// Internal component that uses selection context
interface MessageAreaContentProps {
  virtualListRef: React.RefObject<VirtualMessageListRef>;
  sortedAndGroupedMessages: MessageDTO[];
  currentUserId: string;
  activeConversationId: string;
  isLoadingHistory?: boolean;
  onLoadMore?: () => void;
  onLoadMoreAtBottom?: () => void;
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  openLightbox: (messageIdOrUrl: string, imageIndex?: number) => void; // ✅ Support both single image and album
  handleScrollToMessage: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  isBusinessView: boolean;
  isGroupChat: boolean;
  isAdmin: boolean;
  formatTime: (timestamp: string) => string;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  handleCopyMessage: (content: string) => void;
  showScrollButton: boolean;
  newMessagesCount: number;
  typingUsers: any[];
  lightboxImage: string | null;
  albumLightbox: any;
  closeLightbox: () => void;
}

const MessageAreaContent = memo(({
  virtualListRef,
  sortedAndGroupedMessages,
  currentUserId,
  activeConversationId,
  isLoadingHistory,
  onLoadMore,
  onLoadMoreAtBottom,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
  openLightbox,
  handleScrollToMessage,
  onJumpToMessage,
  isBusinessView,
  isGroupChat,
  isAdmin,
  formatTime,
  getMessageStatus,
  renderMessageStatus,
  getFormattedSender,
  isOwnMessage,
  handleCopyMessage,
  showScrollButton,
  newMessagesCount,
  typingUsers,
  lightboxImage,
  albumLightbox,
  closeLightbox,
}: MessageAreaContentProps) => {
  const {
    isSelectionMode,
    selectedMessageIds,
    selectAllMessages,
    exitSelectionMode,
  } = useMessageSelection();

  // 🆕 Forward dialog state
  const [showForwardDialog, setShowForwardDialog] = useState(false);

  // Handle batch forward
  const handleBatchForward = useCallback(() => {
    console.log('[MessageArea] Opening batch forward dialog:', selectedMessageIds);
    setShowForwardDialog(true);
  }, [selectedMessageIds]);

  // Handle forward success
  const handleForwardSuccess = useCallback(() => {
    console.log('[MessageArea] Forward successful, exiting selection mode');
    setShowForwardDialog(false);
    exitSelectionMode();
  }, [exitSelectionMode]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allMessageIds = sortedAndGroupedMessages
      .filter(m => !m.is_deleted)
      .map(m => m.id)
      .filter(Boolean) as string[];
    selectAllMessages(allMessageIds);
  }, [sortedAndGroupedMessages, selectAllMessages]);

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      {/* Selection Toolbar */}
      {isSelectionMode && (
        <MessageSelectionToolbar
          onForward={handleBatchForward}
          onSelectAll={handleSelectAll}
          totalMessages={sortedAndGroupedMessages.filter(m => !m.is_deleted).length}
        />
      )}

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
      />

      {/* 🆕 Typing Indicator - แสดงที่ด้านล่างของ message area */}
      {typingUsers.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/95 border-t border-border backdrop-blur-sm">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

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

      {/* Single Image Lightbox */}
      {lightboxImage && (
        <MessageLightbox
          imageUrl={lightboxImage}
          onClose={closeLightbox}
        />
      )}

      {/* Album Lightbox (NEW FORMAT) */}
      {albumLightbox && (() => {
        // Find the album message
        const albumMessage = sortedAndGroupedMessages.find(m => m.id === albumLightbox.messageId);

        if (!albumMessage || !albumMessage.album_files || albumMessage.album_files.length === 0) {
          console.warn('[AlbumLightbox] Album message not found or no album_files:', albumLightbox.messageId);
          return null;
        }

        // ✅ Filter to only media files (images/videos) for lightbox
        // Documents are not shown in lightbox
        const mediaFiles = albumMessage.album_files.filter(
          file => file.file_type === 'image' || file.file_type === 'video'
        );

        if (mediaFiles.length === 0) {
          console.warn('[AlbumLightbox] No media files found in album');
          return null;
        }

        return (
          <AlbumLightboxV2
            albumFiles={mediaFiles}
            caption={albumMessage.content}
            initialIndex={albumLightbox.initialIndex}
            isOpen={true}
            onClose={closeLightbox}
          />
        );
      })()}

      {/* 🆕 Batch Forward Dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messageIds={selectedMessageIds}
        onSuccess={handleForwardSuccess}
      />
    </div>
  );
});

MessageAreaContent.displayName = 'MessageAreaContent';

export default memo(MessageArea);