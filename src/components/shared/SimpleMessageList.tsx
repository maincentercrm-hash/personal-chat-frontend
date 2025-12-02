// src/components/shared/SimpleMessageList.tsx
import { memo, forwardRef, useImperativeHandle, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import type { MessageDTO } from '@/types/message.types';

// นำเข้าคอมโพเนนต์ข้อความ
import MessageContextMenu from '@/components/shared/MessageContextMenu';
import TextMessage from '@/components/shared/message/TextMessage';
import StickerMessage from '@/components/shared/message/StickerMessage';
import ImageMessage from '@/components/shared/message/ImageMessage';
import FileMessage from '@/components/shared/message/FileMessage';
import ReplyMessage from '@/components/shared/message/ReplyMessage';
import { AlbumMessage } from '@/components/shared/message/AlbumMessage';
import DateBadge from '@/components/shared/DateBadge';
import ForwardMessageDialog from '@/components/shared/ForwardMessageDialog';

// Album helpers
import { groupMessagesByAlbum } from '@/utils/album/albumHelpers';

// Date utilities
import { formatDateBadge } from '@/utils/time/dateBadge';

interface SimpleMessageListProps {
  messages: MessageDTO[];
  currentUserId: string;
  activeConversationId: string;

  // Callbacks
  onLoadMore?: () => void;
  onReplyMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onResendMessage?: (messageId: string) => void;
  onImageClick?: (imageUrl: string) => void;
  scrollToMessage?: (messageId: string) => void;

  // Display options
  isBusinessView?: boolean;
  isAdmin?: boolean;
  formatTime: (timestamp: string) => string;
  getMessageStatus: (message: MessageDTO, isUser: boolean) => string | undefined;
  renderMessageStatus: (status: string | null) => string | null;
  getFormattedSender: (message: MessageDTO, defaultName?: string) => string;
  isOwnMessage: (message: MessageDTO) => boolean;
  handleCopyMessage: (content: string) => void;
}

export interface SimpleMessageListRef {
  scrollToMessage: (messageId: string) => void;
  scrollToBottom: (smooth?: boolean) => void;
}

/**
 * Simple Message List (NO Virtualization)
 * ไม่ใช้ virtual scrolling - render ข้อความทั้งหมด
 * เหมาะสำหรับ chat ที่มี dynamic height
 */
const SimpleMessageList = forwardRef<SimpleMessageListRef, SimpleMessageListProps>((
  {
    messages,
    currentUserId,
    activeConversationId: _activeConversationId,
    onLoadMore,
    onReplyMessage,
    onEditMessage,
    onDeleteMessage,
    onResendMessage,
    onImageClick,
    scrollToMessage: scrollToMessageProp,
    isBusinessView = false,
    formatTime,
    getMessageStatus,
    renderMessageStatus,
    getFormattedSender,
    isOwnMessage,
    handleCopyMessage,
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const isJumpingRef = useRef(false);

  // ✅ Date Badge: Track current visible date
  const [currentDate, setCurrentDate] = useState<string>('');

  // ✅ Forward Message Dialog
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardMessageIds, setForwardMessageIds] = useState<string[]>([]);

  // ฟังก์ชันช่วยสำหรับจัดการค่า messageStatus ให้เป็น string | undefined เท่านั้น
  const formatMessageStatus = useCallback((status: string | null): string | undefined => {
    return status === null ? undefined : status;
  }, []);

  // ✅ Forward Message Handler
  // Note: Currently not connected to UI - will be implemented when needed
  // const handleForwardMessage = useCallback((messageId: string) => {
  //   console.log('[SimpleMessageList] Opening forward dialog for message:', messageId);
  //   setForwardMessageIds([messageId]);
  //   setShowForwardDialog(true);
  // }, []);

  const handleForwardSuccess = useCallback(() => {
    console.log('[SimpleMessageList] Forward successful');
    setShowForwardDialog(false);
    setForwardMessageIds([]);
  }, []);

  // Check if at bottom
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  // Jump to message
  const jumpToMessage = useCallback((messageId: string) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!element || !containerRef.current) {
      console.warn(`Message ${messageId} not found`);
      return;
    }

    console.log(`🎯 Jumping to message: ${messageId}`);
    isJumpingRef.current = true;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Highlight
    element.classList.add('ring-4', 'ring-yellow-400', 'transition-all', 'duration-300');
    setTimeout(() => {
      element.classList.remove('ring-4', 'ring-yellow-400');
      isJumpingRef.current = false;
    }, 2000);
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottomRef.current && !isJumpingRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [messages.length, scrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    isAtBottomRef.current = checkIfAtBottom();

    // Load more when near top
    if (containerRef.current && containerRef.current.scrollTop < 200) {
      onLoadMore?.();
    }
  }, [checkIfAtBottom, onLoadMore]);

  // Group album messages
  const { grouped: groupedAlbums, standalone: _standaloneMessages } = useMemo(() => {
    return groupMessagesByAlbum(messages);
  }, [messages]);

  // Track processed album IDs to avoid duplicate rendering
  const processedAlbumIds = useRef(new Set<string>());

  // Reset processed IDs when messages change
  useEffect(() => {
    processedAlbumIds.current = new Set();
  }, [messages]);

  // ✅ Date Badge: Track current visible date based on scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const updateCurrentDate = () => {
      console.log('[DateBadge] SimpleMessageList updateCurrentDate called');

      // Find first visible message based on scroll position
      // const _containerTop = container.scrollTop; // Reserved for future use
      const messageElements = container.querySelectorAll('[data-message-id]');

      console.log('[DateBadge] Found message elements:', messageElements.length);

      for (const element of Array.from(messageElements)) {
        const rect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if message is visible in viewport
        if (rect.top >= containerRect.top && rect.top <= containerRect.top + 100) {
          const messageId = element.getAttribute('data-message-id');
          const message = messages.find(m => m.id === messageId);

          console.log('[DateBadge] First visible message:', {
            id: messageId,
            created_at: message?.created_at,
            content: message?.content?.substring(0, 30)
          });

          if (message?.created_at) {
            const newDate = formatDateBadge(message.created_at);
            console.log('[DateBadge] Date calculation:', {
              timestamp: message.created_at,
              newDate,
              currentDate,
              willUpdate: newDate !== currentDate
            });

            if (newDate !== currentDate) {
              console.log('[DateBadge] ✅ Updating currentDate to:', newDate);
              setCurrentDate(newDate);
            }
          }
          break;
        }
      }

      // Fallback: use first message if nothing found
      if (messageElements.length > 0 && !currentDate && messages[0]?.created_at) {
        console.log('[DateBadge] Using fallback (first message)');
        const newDate = formatDateBadge(messages[0].created_at);
        setCurrentDate(newDate);
      }
    };

    // Update on scroll
    container.addEventListener('scroll', updateCurrentDate);
    // Initial update
    updateCurrentDate();

    return () => {
      container.removeEventListener('scroll', updateCurrentDate);
    };
  }, [messages, currentDate]);

  // Expose API via ref
  useImperativeHandle(
    ref,
    () => ({
      scrollToMessage: jumpToMessage,
      scrollToBottom
    }),
    [jumpToMessage, scrollToBottom]
  );

  // Render album
  const renderAlbum = useCallback(
    (albumId: string, albumMessages: MessageDTO[]) => {
      if (!albumMessages || albumMessages.length === 0) return null;

      const firstMessage = albumMessages[0];
      const isUser = isOwnMessage(firstMessage);
      const messageStatus = getMessageStatus(firstMessage, isUser);
      const status = renderMessageStatus(messageStatus || null);
      const formattedStatus = formatMessageStatus(status);
      const formattedSender = getFormattedSender(firstMessage, firstMessage.sender_name);

      return (
        <div
          key={`album-${albumId}`}
          data-message-id={firstMessage.id}
          className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
        >
          <div className={`max-w-[70%] grid grid-cols-1`}>
            <AlbumMessage
              albumId={albumId}
              messages={albumMessages}
              isUser={isUser}
              formatTime={formatTime}
              messageStatus={formattedStatus}
              senderName={formattedSender}
              isBusinessView={isBusinessView}
              onImageClick={(_messageId, imageIndex) => {
                const message = albumMessages[imageIndex];
                if (message?.media_url) {
                  onImageClick?.(message.media_url);
                }
              }}
            />
          </div>
        </div>
      );
    },
    [isOwnMessage, getFormattedSender, isBusinessView, formatTime, getMessageStatus, renderMessageStatus, formatMessageStatus, onImageClick]
  );

  // Render message
  const renderMessage = useCallback(
    (message: MessageDTO) => {
      // Check if this message is part of an album
      const albumId = message.metadata?.album_id;

      if (albumId) {
        // Skip if already processed
        if (processedAlbumIds.current.has(albumId)) {
          return null;
        }

        // Mark as processed
        processedAlbumIds.current.add(albumId);

        // Get all messages in this album
        const albumMessages = groupedAlbums[albumId];
        if (albumMessages && albumMessages.length > 0) {
          return renderAlbum(albumId, albumMessages);
        }
      }

      // Regular message (not album)
      const isUser = isOwnMessage(message);
      const messageStatus = getMessageStatus(message, isUser);
      const status = renderMessageStatus(messageStatus || null);
      const formattedStatus = formatMessageStatus(status);
      const formattedSender = getFormattedSender(message, message.sender_name);

      return (
        <div
          key={message.id || message.temp_id}
          data-message-id={message.id}
          className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}
        >
          {onReplyMessage || onEditMessage || onDeleteMessage || onResendMessage ? (
            <MessageContextMenu
              message={message}
              currentUserId={currentUserId}
              onReply={messageId => onReplyMessage?.(messageId)}
              onEdit={messageId => onEditMessage?.(messageId)}
              onCopy={handleCopyMessage}
              onResend={onResendMessage}
            >
              <div className={`max-w-[70%] grid grid-cols-1`}>
                {/* Render message based on type */}
                {message.message_type === 'text' &&
                  (message.reply_to_message || message.reply_to_id ? (
                    <ReplyMessage
                      message={message}
                      isUser={isUser}
                      formatTime={formatTime}
                      messageStatus={formattedStatus}
                      isBusinessView={isBusinessView}
                      senderName={formattedSender}
                      onJumpToMessage={scrollToMessageProp}
                    />
                  ) : (
                    <TextMessage
                      message={message}
                      isUser={isUser}
                      formatTime={formatTime}
                      messageStatus={formattedStatus}
                      isBusinessView={isBusinessView}
                      senderName={formattedSender}
                    />
                  ))}

                {message.message_type === 'sticker' && (
                  <StickerMessage
                    message={message}
                    isUser={isUser}
                    formatTime={formatTime}
                    messageStatus={formattedStatus}
                    isBusinessView={isBusinessView}
                    senderName={formattedSender}
                  />
                )}

                {message.message_type === 'image' && (
                  <ImageMessage
                    message={message}
                    isUser={isUser}
                    formatTime={formatTime}
                    messageStatus={formattedStatus}
                    onImageClick={onImageClick || (() => {})}
                    isBusinessView={isBusinessView}
                    senderName={formattedSender}
                  />
                )}

                {message.message_type === 'file' && (
                  <FileMessage
                    message={message}
                    isUser={isUser}
                    formatTime={formatTime}
                    messageStatus={formattedStatus}
                    isBusinessView={isBusinessView}
                    senderName={formattedSender}
                  />
                )}
              </div>
            </MessageContextMenu>
          ) : (
            <div className={`max-w-[70%] grid grid-cols-1`}>
              {/* Same rendering without context menu */}
              {message.message_type === 'text' &&
                (message.reply_to_message || message.reply_to_id ? (
                  <ReplyMessage
                    message={message}
                    isUser={isUser}
                    formatTime={formatTime}
                    messageStatus={formattedStatus}
                    isBusinessView={isBusinessView}
                    senderName={formattedSender}
                    onJumpToMessage={scrollToMessageProp}
                  />
                ) : (
                  <TextMessage
                    message={message}
                    isUser={isUser}
                    formatTime={formatTime}
                    messageStatus={formattedStatus}
                    isBusinessView={isBusinessView}
                    senderName={formattedSender}
                  />
                ))}

              {message.message_type === 'sticker' && (
                <StickerMessage
                  message={message}
                  isUser={isUser}
                  formatTime={formatTime}
                  messageStatus={formattedStatus}
                  isBusinessView={isBusinessView}
                  senderName={formattedSender}
                />
              )}

              {message.message_type === 'image' && (
                <ImageMessage
                  message={message}
                  isUser={isUser}
                  formatTime={formatTime}
                  messageStatus={formattedStatus}
                  onImageClick={onImageClick || (() => {})}
                  isBusinessView={isBusinessView}
                  senderName={formattedSender}
                />
              )}

              {message.message_type === 'file' && (
                <FileMessage
                  message={message}
                  isUser={isUser}
                  formatTime={formatTime}
                  messageStatus={formattedStatus}
                  isBusinessView={isBusinessView}
                  senderName={formattedSender}
                />
              )}
            </div>
          )}
        </div>
      );
    },
    [
      isOwnMessage,
      getMessageStatus,
      renderMessageStatus,
      formatMessageStatus,
      getFormattedSender,
      currentUserId,
      onReplyMessage,
      onEditMessage,
      onDeleteMessage,
      onResendMessage,
      handleCopyMessage,
      formatTime,
      isBusinessView,
      scrollToMessageProp,
      onImageClick
    ]
  );

  if (messages.length === 0) {
    return (
      <>
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">ยังไม่มีข้อความ</p>
          <p className="text-sm text-muted-foreground">ส่งข้อความแรกเพื่อเริ่มการสนทนา</p>
        </div>
      </div>

      {/* Forward Dialog even when empty */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        messageIds={forwardMessageIds}
        onSuccess={handleForwardSuccess}
      />
      </>
    );
  }

  return (
    <>
    <div
      ref={containerRef}
      className="flex-1 bg-background overflow-y-auto min-h-0 relative"
      onScroll={handleScroll}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* ✅ Telegram-style Date Badge (Sticky, floating at top center) */}
      {currentDate && (
        <div className="sticky top-4 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
          <DateBadge date={currentDate} />
        </div>
      )}

      {messages.map(message => renderMessage(message))}
    </div>

    {/* ✅ Forward Message Dialog - MOVED OUTSIDE scroll container to avoid pointer-events issues */}
    <ForwardMessageDialog
      open={showForwardDialog}
      onOpenChange={setShowForwardDialog}
      messageIds={forwardMessageIds}
      onSuccess={handleForwardSuccess}
    />
    </>
  );
});

SimpleMessageList.displayName = 'SimpleMessageList';

export default memo(SimpleMessageList);
