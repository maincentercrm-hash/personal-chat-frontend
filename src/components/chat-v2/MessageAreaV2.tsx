/**
 * MessageAreaV2 - Integration wrapper for chat-v2 components
 *
 * This is the main component to use for integrating chat-v2
 * into existing pages. It wraps MessageList and handles:
 * - Lightbox for images/albums
 * - Typing indicator
 * - Selection mode toolbar
 * - Forward dialog
 */

import { memo, forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { MessageList } from './MessageList';
import type { MessageListRef } from './MessageList';
import { useMessageListContext, MessageListProvider } from './MessageList';
import { SelectionToolbar } from './interactions';

// Import existing components (reuse from current codebase)
import MessageLightbox from '@/components/shared/message/MessageLightbox';
import { AlbumLightboxV2 } from '@/components/shared/AlbumLightboxV2';
import { TypingIndicator } from '@/components/shared/TypingIndicator';
import ForwardMessageDialog from '@/components/shared/ForwardMessageDialog';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

// Import Telegram styles
import './styles/telegram.css';

// ============================================
// Types
// ============================================

export interface MessageAreaV2Props {
  /** Messages to display */
  messages: MessageDTO[];

  /** Current user ID */
  currentUserId: string;

  /** Active conversation ID */
  conversationId: string;

  /** Loading state for history */
  isLoadingHistory?: boolean;

  /** Has more messages to load at top */
  hasMoreTop?: boolean;

  /** Has more messages to load at bottom (after jump) */
  hasMoreBottom?: boolean;

  /** Is group chat */
  isGroupChat?: boolean;

  /** Is business view (determines own message detection) */
  isBusinessView?: boolean;

  /** Load more callback (at top) */
  onLoadMore?: () => Promise<void> | void;

  /** Load more callback (at bottom - after jump) */
  onLoadMoreBottom?: () => Promise<void> | void;

  /** Jump to latest messages (re-fetch from API) */
  onJumpToLatest?: () => Promise<void> | void;

  /** Message action callbacks */
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export interface MessageAreaV2Ref {
  /** Scroll to specific message */
  scrollToMessage: (messageId: string) => void;

  /** Scroll to bottom */
  scrollToBottom: (smooth?: boolean) => void;
}

// ============================================
// Internal Component (uses context)
// ============================================

interface MessageAreaInternalProps {
  messages: MessageDTO[];
  isLoadingHistory?: boolean;
  hasMoreTop?: boolean;
  hasMoreBottom?: boolean;
  isGroupChat?: boolean;
  onLoadMore?: () => Promise<void> | void;
  onLoadMoreBottom?: () => Promise<void> | void;
  onJumpToLatest?: () => Promise<void> | void;
  onDelete?: (messageId: string) => void;
  listRef: React.RefObject<MessageListRef>;
  // Lightbox state passed from parent
  lightboxImage: string | null;
  setLightboxImage: (url: string | null) => void;
  albumLightbox: { messageId: string; initialIndex: number } | null;
  setAlbumLightbox: (data: { messageId: string; initialIndex: number } | null) => void;
  albumMessage: MessageDTO | null | undefined;
}

const MessageAreaInternal = memo(function MessageAreaInternal({
  messages,
  isLoadingHistory,
  hasMoreTop,
  hasMoreBottom,
  isGroupChat,
  onLoadMore,
  onLoadMoreBottom,
  onJumpToLatest,
  onDelete,
  listRef,
  lightboxImage,
  setLightboxImage,
  albumLightbox,
  setAlbumLightbox,
  albumMessage,
}: MessageAreaInternalProps) {
  const {
    currentUserId,
    conversationId,
    isSelectionMode,
    selectedMessageIds,
    exitSelectionMode,
  } = useMessageListContext();

  // Forward dialog state
  const [forwardMessages, setForwardMessages] = useState<string[]>([]);

  // Typing indicator
  const { typingUsers } = useTypingIndicator({
    conversationId,
    currentUserId,
  });

  // Handle forward from selection
  const handleForwardSelected = useCallback(() => {
    setForwardMessages(Array.from(selectedMessageIds));
  }, [selectedMessageIds]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(() => {
    selectedMessageIds.forEach(id => {
      onDelete?.(id);
    });
    exitSelectionMode();
  }, [selectedMessageIds, onDelete, exitSelectionMode]);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Selection toolbar - at top for better mobile UX */}
      {isSelectionMode && (
        <SelectionToolbar
          selectedCount={selectedMessageIds.size}
          onClose={exitSelectionMode}
          onForward={handleForwardSelected}
          onDelete={onDelete ? handleDeleteSelected : undefined}
        />
      )}

      {/* Message list */}
      <div className="flex-1 min-h-0">
        <MessageList
          ref={listRef}
          messages={messages}
          currentUserId={currentUserId}
          conversationId={conversationId}
          onLoadMore={onLoadMore}
          onLoadMoreBottom={onLoadMoreBottom}
          onJumpToLatest={onJumpToLatest}
          isLoadingTop={isLoadingHistory}
          hasMoreTop={hasMoreTop}
          hasMoreBottom={hasMoreBottom}
          isGroupChat={isGroupChat}
        />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 border-t bg-background">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

      {/* Image lightbox */}
      {lightboxImage && (
        <MessageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Album lightbox */}
      {albumMessage && albumLightbox && albumMessage.album_files && (
        <AlbumLightboxV2
          albumFiles={albumMessage.album_files}
          caption={albumMessage.content}
          initialIndex={albumLightbox.initialIndex}
          isOpen={true}
          onClose={() => setAlbumLightbox(null)}
        />
      )}

      {/* Forward dialog */}
      <ForwardMessageDialog
        open={forwardMessages.length > 0}
        onOpenChange={(open) => {
          if (!open) setForwardMessages([]);
        }}
        messageIds={forwardMessages}
        onSuccess={() => {
          setForwardMessages([]);
          exitSelectionMode();
        }}
      />
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const MessageAreaV2 = memo(
  forwardRef<MessageAreaV2Ref, MessageAreaV2Props>(function MessageAreaV2(
    {
      messages,
      currentUserId,
      conversationId,
      isLoadingHistory = false,
      hasMoreTop = true,
      hasMoreBottom = false,
      isGroupChat = false,
      onLoadMore,
      onLoadMoreBottom,
      onJumpToLatest,
      onReply,
      onEdit,
      onDelete,
      onResend,
      onJumpToMessage,
    },
    ref
  ) {
    const listRef = useRef<MessageListRef>(null);

    // Lightbox state (moved here to share with provider)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [albumLightbox, setAlbumLightbox] = useState<{
      messageId: string;
      initialIndex: number;
    } | null>(null);

    // Handle media click (moved here so it can be passed to provider)
    const handleMediaClick = useCallback((messageId: string, mediaIndex?: number) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Album
      if (message.album_files && message.album_files.length > 1) {
        setAlbumLightbox({
          messageId,
          initialIndex: mediaIndex ?? 0,
        });
        return;
      }

      // Single image
      if (message.message_type === 'image' && message.media_url) {
        setLightboxImage(message.media_url);
      }
    }, [messages]);

    // Handle copy
    const handleCopy = useCallback((content: string) => {
      navigator.clipboard.writeText(content);
    }, []);

    // Get album message for lightbox
    const albumMessage = albumLightbox
      ? messages.find(m => m.id === albumLightbox.messageId)
      : null;

    // Expose methods
    useImperativeHandle(
      ref,
      () => ({
        scrollToMessage: (messageId: string) => {
          listRef.current?.scrollToMessage(messageId);
        },
        scrollToBottom: (smooth = true) => {
          listRef.current?.scrollToBottom(smooth);
        },
      }),
      []
    );

    return (
      <MessageListProvider
        currentUserId={currentUserId}
        conversationId={conversationId}
        isGroupChat={isGroupChat}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onResend={onResend}
        onJumpToMessage={onJumpToMessage}
        onCopy={handleCopy}
        onMediaClick={handleMediaClick}
      >
        <MessageAreaInternal
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          hasMoreTop={hasMoreTop}
          hasMoreBottom={hasMoreBottom}
          isGroupChat={isGroupChat}
          onLoadMore={onLoadMore}
          onLoadMoreBottom={onLoadMoreBottom}
          onJumpToLatest={onJumpToLatest}
          onDelete={onDelete}
          listRef={listRef as React.RefObject<MessageListRef>}
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          albumLightbox={albumLightbox}
          setAlbumLightbox={setAlbumLightbox}
          albumMessage={albumMessage}
        />
      </MessageListProvider>
    );
  })
);

export default MessageAreaV2;
