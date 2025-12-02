// src/components/shared/VirtualMessageList/MessageItem.tsx
import { memo, useMemo, useRef, useLayoutEffect } from 'react';
import type { MessageDTO } from '@/types/message.types';

// Context
import { useMessageListContext } from '@/contexts/MessageListContext';
import { useMessageSelection } from '@/contexts/MessageSelectionContext';

// Hooks
import { useLongPress } from '@/hooks/useLongPress';

// UI Components
import { Checkbox } from '@/components/ui/checkbox';

// Message Components
import MessageContextMenu from '@/components/shared/MessageContextMenu';
import TextMessage from '@/components/shared/message/TextMessage';
import StickerMessage from '@/components/shared/message/StickerMessage';
import ImageMessage from '@/components/shared/message/ImageMessage';
import FileMessage from '@/components/shared/message/FileMessage';
import ReplyMessage from '@/components/shared/message/ReplyMessage';
import { AlbumMessageV2 } from '@/components/shared/message/AlbumMessageV2';

// ========================================
// MESSAGE ITEM COMPONENT
// ========================================

interface MessageItemProps {
  message: MessageDTO;
}

export const MessageItem = memo(({ message }: MessageItemProps) => {
  // ✅ Safety check FIRST: must be before any hooks (Rules of Hooks)
  if (!message || !message.id) {
    console.error('[MessageItem] Received undefined message or missing ID');
    return null;
  }

  // Get all values from context (no more props drilling!)
  const {
    isOwnMessage,
    getMessageStatus,
    renderMessageStatus,
    formatMessageStatus,
    getFormattedSender,
    formatTime,
    onImageClick,
    onJumpToMessage,
    onReplyMessage,
    onEditMessage,
    onDeleteMessage,
    onResendMessage,
    onForwardMessage: _onForwardMessage,
    handleCopyMessage,
    groupedAlbums,
    renderAlbum,
    updateHeightCache,
    estimateMessageHeight,
    USE_HEIGHT_CACHE,
    USE_RESIZE_OBSERVER,
    isBusinessView,
    isGroupChat,
    currentUserId
  } = useMessageListContext();

  // 🆕 Selection context
  const {
    isSelectionMode,
    isMessageSelected,
    enterSelectionMode,
    toggleMessageSelection,
  } = useMessageSelection();

  const isSelected = isMessageSelected(message.id);

  // 🆕 Long press handler to enter selection mode
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!message.is_deleted && !isSelectionMode) {
        console.log('[MessageItem] Long press detected, entering selection mode');
        enterSelectionMode(message.id);
      }
    },
    onClick: () => {
      // If in selection mode, toggle selection on click
      if (isSelectionMode && !message.is_deleted) {
        toggleMessageSelection(message.id);
      }
    },
    threshold: 500, // 500ms long press
  });

  // ✅ CRITICAL: Ref and hooks MUST be called for ALL message types (Rules of Hooks)
  const messageRef = useRef<HTMLDivElement>(null);

  // ✅ CRITICAL: useLayoutEffect MUST be called for ALL message types
  useLayoutEffect(() => {
    const element = messageRef.current;
    if (!element || !message.id || !USE_HEIGHT_CACHE.current || !USE_RESIZE_OBSERVER.current) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    let stabilityTimer: NodeJS.Timeout | null = null;
    const hasMedia = message.message_type === 'image' || message.message_type === 'sticker';

    const measureHeight = () => {
      const rect = element.getBoundingClientRect();
      if (rect.height > 0) {
        updateHeightCache(message.id!, rect.height);
        return rect.height;
      }
      return 0;
    };

    const initialHeight = measureHeight();
    const estimated = estimateMessageHeight(message);

    if (initialHeight > 0) {
      const initialDiff = Math.abs(initialHeight - estimated);
      console.log(`[HeightCache] ${message.id?.slice(0, 8)} (${message.message_type}): INITIAL estimated=${estimated}px → actual=${initialHeight}px (diff: ${initialDiff}px)`);
    }

    if (!hasMedia) {
      stabilityTimer = setTimeout(() => {
        const finalHeight = measureHeight();
        const diff = Math.abs(finalHeight - estimated);
        const diffPercent = ((diff / estimated) * 100).toFixed(1);

        console.log(`[HeightCache] ${message.id?.slice(0, 8)} (${message.message_type}): FINAL estimated=${estimated}px → actual=${finalHeight}px (diff: ${diff}px / ${diffPercent}%)`);

        if (diff > 5) {
          console.warn(`[HeightCache] ⚠️ Large height difference for ${message.id?.slice(0, 8)}! Content length: ${message.content?.length || 0}`);
        }
      }, 300);

      return () => {
        if (stabilityTimer) clearTimeout(stabilityTimer);
      };
    }

    const observer = new ResizeObserver((entries) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        for (const entry of entries) {
          const height = entry.contentRect.height;
          if (height > 0) {
            updateHeightCache(message.id!, height);
          }
        }
      }, 150);
    });

    observer.observe(element);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (stabilityTimer) clearTimeout(stabilityTimer);
      observer.disconnect();
    };
  }, [message.id, message.message_type, updateHeightCache, estimateMessageHeight, USE_HEIGHT_CACHE, USE_RESIZE_OBSERVER]);

  // ✅ Calculate common values OUTSIDE useMemo (needed for both rendering and dependencies)
  const isUser = isOwnMessage(message);
  const messageStatus = getMessageStatus(message, isUser);
  const status = renderMessageStatus(messageStatus || null);
  const formattedStatus = formatMessageStatus(status);
  const formattedSender = getFormattedSender(message, message.sender_name);

  // ✅ Check for album formats BEFORE rendering (but after all hooks)
  const isNewAlbum = message.message_type === 'album' && message.album_files && message.album_files.length > 0;
  const albumId = message.metadata?.album_id;
  const albumPosition = message.metadata?.album_position;
  const isOldAlbum = albumId !== undefined && albumPosition !== undefined;

  // ✅ CRITICAL: useMemo MUST be called for ALL message types (Rules of Hooks)
  // Memoize message content to avoid re-creating on every render
  const messageContent = useMemo(() => {
    console.log('[MessageItem] Rendering:', message.message_type, message.id?.slice(0, 8));

    // ✅ NEW ALBUM FORMAT: Handle album_files
    if (isNewAlbum) {
      // Special case: Single document file wrapped in album format
      if (message.album_files!.length === 1 && message.album_files![0].file_type === 'file') {
        console.log('📄 [File in Album] Rendering single document file:', {
          messageId: message.id?.slice(0, 8),
          fileUrl: message.album_files![0].media_url
        });

        const fileData = message.album_files![0];
        const urlParts = fileData.media_url.split('/');
        const encodedFilename = urlParts[urlParts.length - 1];
        const filename = decodeURIComponent(encodedFilename);

        const fileMessage: MessageDTO = {
          ...message,
          media_url: fileData.media_url,
          metadata: {
            ...message.metadata,
            file_name: fileData.file_name || filename,
            ...(fileData.file_size && { file_size: fileData.file_size }),
            file_type: fileData.file_type_ext || 'file'
          }
        };

        return (
          <FileMessage
            message={fileMessage}
            isUser={isUser}
            formatTime={formatTime}
            messageStatus={formattedStatus}
            isBusinessView={isBusinessView}
            isGroupChat={isGroupChat}
            senderName={formattedSender}
          />
        );
      }

      // Normal album with images/videos
      console.log('📸 [Album NEW] Rendering album with album_files:', {
        messageId: message.id?.slice(0, 8),
        fileCount: message.album_files!.length
      });

      return (
        <AlbumMessageV2
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          onImageClick={onImageClick}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
        />
      );
    }

    // ✅ OLD ALBUM FORMAT: Handle metadata-based albums
    if (isOldAlbum) {
      if (albumPosition === 0) {
        const albumMessages = groupedAlbums[albumId];
        if (albumMessages && albumMessages.length > 0) {
          console.log('📸 [Album OLD] Rendering album at position 0:', {
            albumId: albumId.slice(0, 8),
            messageCount: albumMessages.length
          });
          return renderAlbum(albumId, albumMessages);
        }
      } else {
        // Skip other positions - return empty placeholder
        return <div style={{ height: 0, overflow: 'hidden' }} data-album-position={albumPosition} />;
      }
    }

    // ✅ REGULAR MESSAGES

    if (message.message_type === 'text') {
      return message.reply_to_message || message.reply_to_id ? (
        <ReplyMessage
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
          onJumpToMessage={onJumpToMessage}
        />
      ) : (
        <TextMessage
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
        />
      );
    }

    if (message.message_type === 'sticker') {
      return (
        <StickerMessage
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
        />
      );
    }

    if (message.message_type === 'image') {
      return (
        <ImageMessage
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          onImageClick={onImageClick || (() => {})}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
        />
      );
    }

    if (message.message_type === 'file') {
      return (
        <FileMessage
          message={message}
          isUser={isUser}
          formatTime={formatTime}
          messageStatus={formattedStatus}
          isBusinessView={isBusinessView}
          isGroupChat={isGroupChat}
          senderName={formattedSender}
        />
      );
    }

    console.log('[MessageItem] Unknown type:', message.message_type);
    return null;
  }, [
    message,
    isUser,
    formattedStatus,
    formattedSender,
    isNewAlbum,
    isOldAlbum,
    albumId,
    albumPosition,
    groupedAlbums,
    renderAlbum,
    onImageClick,
    onJumpToMessage,
    formatTime,
    isBusinessView,
    isGroupChat
  ]);

  return (
    <div
      ref={messageRef}
      data-message-id={message.id}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1 ${
        isSelected ? 'bg-accent/30' : ''
      } ${isSelectionMode ? 'cursor-pointer' : ''} transition-colors`}
      {...longPressHandlers}
    >
      {/* 🆕 Selection Checkbox (left side for all messages) */}
      {isSelectionMode && (
        <div className="flex items-center mr-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleMessageSelection(message.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ✅ Inline editing handled inside TextMessage component */}
      {(onReplyMessage || onEditMessage || onDeleteMessage || onResendMessage) && !isSelectionMode ? (
        <MessageContextMenu
          message={message}
          currentUserId={currentUserId}
          onReply={(messageId) => onReplyMessage?.(messageId)}
          onEdit={(messageId) => onEditMessage?.(messageId)}
          onCopy={handleCopyMessage}
          onResend={onResendMessage}
        >
          <div className="max-w-[70%]">
            {messageContent}
          </div>
        </MessageContextMenu>
      ) : (
        <div className="max-w-[70%]">
          {messageContent}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison to prevent unnecessary re-renders
  const prev = prevProps.message;
  const next = nextProps.message;

  // ⚠️ IMPORTANT: Return TRUE = skip re-render, FALSE = do re-render
  // If ANY property changes, we MUST re-render
  const shouldSkipRender = (
    prev.id === next.id &&
    prev.content === next.content &&
    prev.media_url === next.media_url &&
    prev.status === next.status &&
    prev.message_type === next.message_type &&
    prev.updated_at === next.updated_at
  );

  // 🔍 DEBUG: Log when message changes
  if (!shouldSkipRender) {
    console.log('[MessageItem] Re-rendering due to changes:', {
      id: prev.id?.slice(0, 8),
      contentChanged: prev.content !== next.content,
      statusChanged: prev.status !== next.status,
      updatedAtChanged: prev.updated_at !== next.updated_at
    });
  }

  return shouldSkipRender;
});

MessageItem.displayName = 'MessageItem';
