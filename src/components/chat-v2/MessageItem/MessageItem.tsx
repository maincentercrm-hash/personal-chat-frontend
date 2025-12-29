/**
 * MessageItem - Main wrapper for individual messages
 *
 * Responsibilities:
 * - Determine position in group (first/middle/last/single)
 * - Handle selection mode
 * - Wrap with context menu
 * - Render appropriate message content
 */

import { memo, useMemo, useCallback } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { useMessageListContext } from '../MessageList/MessageListContext';
import { getMessagePosition } from '../MessageList/types';
import { MessageContent } from './MessageContent';
import MessageContextMenu from '@/components/shared/MessageContextMenu';
import { SystemMessage } from '../messages/SystemMessage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfilePopover } from '@/components/shared/UserProfilePopover';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface MessageItemProps {
  /** Message data */
  message: MessageDTO;

  /** Previous message (for grouping) */
  prevMessage?: MessageDTO;

  /** Next message (for grouping) */
  nextMessage?: MessageDTO;
}

// ============================================
// Component
// ============================================

export const MessageItem = memo(function MessageItem({
  message,
  prevMessage,
  nextMessage,
}: MessageItemProps) {
  // ✅ Handle system messages - render centered without context menu
  if (message.message_type === 'system') {
    return <SystemMessage message={message} />;
  }

  const {
    currentUserId,
    isOwnMessage,
    formatTime,
    getSenderName,
    isGroupChat,
    onMediaClick,
    onJumpToMessage,
    onReply,
    onEdit,
    onDelete,
    onResend,
    onCopy,
    onPin,
    onUnpin,
    isSelectionMode,
    selectedMessageIds,
    toggleSelection,
    enterSelectionMode,
  } = useMessageListContext();

  // Calculate derived values
  const isOwn = isOwnMessage(message);
  const time = formatTime(message.created_at);
  const senderName = getSenderName(message);

  // Get position in message group
  const position = useMemo(
    () => getMessagePosition(message, prevMessage, nextMessage),
    [message, prevMessage, nextMessage]
  );

  // Should show sender name (group chat, first in group)
  const showSender = isGroupChat && !isOwn && (position === 'single' || position === 'first');

  // ✅ Should show avatar (both group chat AND direct chat, last in group or single)
  const showAvatar = !isOwn && (position === 'single' || position === 'last');

  // Get sender info for avatar
  const senderAvatar = message.sender_info?.profile_image_url || message.sender?.profile_image_url || message.sender_avatar;
  const senderId = message.sender_id;

  // Selection state
  const isSelected = selectedMessageIds.has(message.id);

  // Calculate gap based on grouping
  const gapClass = useMemo(() => {
    if (position === 'first' || position === 'single') {
      // New group - larger gap
      return 'mt-2';
    }
    // Same group - small gap
    return 'mt-[2px]';
  }, [position]);

  // Handle click
  const handleClick = () => {
    if (isSelectionMode) {
      toggleSelection(message.id);
    }
  };

  // Handle copy
  const handleCopy = useCallback((content: string) => {
    if (onCopy) {
      onCopy(content);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(content);
    }
  }, [onCopy]);

  // Handle reply
  const handleReply = useCallback((messageId: string) => {
    console.log('[MessageItem] handleReply called:', messageId);
    onReply?.(messageId);
  }, [onReply]);

  // Handle edit
  const handleEdit = useCallback((messageId: string) => {
    console.log('[MessageItem] handleEdit called:', messageId);
    onEdit?.(messageId);
  }, [onEdit]);

  // Handle forward - enter selection mode with this message
  const handleForward = useCallback((messageId: string) => {
    console.log('[MessageItem] handleForward called:', messageId);
    enterSelectionMode(messageId);
  }, [enterSelectionMode]);

  // Handle media click
  const handleMediaClick = (index?: number) => {
    if (!isSelectionMode) {
      onMediaClick?.(message.id, index);
    }
  };

  // Handle jump to replied message
  const handleJumpToReply = () => {
    if (message.reply_to_message?.id) {
      onJumpToMessage?.(message.reply_to_message.id);
    }
  };

  // Message content element
  const messageContent = (
    <MessageContent
      message={message}
      isOwn={isOwn}
      position={position}
      time={time}
      showSender={showSender}
      senderName={senderName}
      onMediaClick={handleMediaClick}
      onJumpToReply={handleJumpToReply}
    />
  );

  // Check if context menu should be shown
  const showContextMenu = !isSelectionMode && (onReply || onEdit || onDelete || onResend);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        'flex px-2',
        isOwn ? 'justify-end' : 'justify-start',
        gapClass,
        isSelected && 'bg-[var(--selection-bg)]',
        isSelectionMode && 'cursor-pointer',
        'transition-colors duration-150'
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className={cn(
          'flex items-center',
          isOwn ? 'order-2 ml-2' : 'order-first mr-2'
        )}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(message.id)}
            className="w-5 h-5 rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ✅ Avatar for both group chat AND direct chat (other users) */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8 mr-2 self-end">
          {showAvatar && senderId ? (
            <UserProfilePopover
              userId={senderId}
              displayName={senderName || ''}
              profileImageUrl={senderAvatar}
              username={message.sender_info?.username || message.sender?.username}
            >
              <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={senderAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {senderName?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </UserProfilePopover>
          ) : (
            // Placeholder for alignment when avatar is not shown
            <div className="h-8 w-8" />
          )}
        </div>
      )}

      {/* Message content with or without context menu */}
      {showContextMenu ? (
        <MessageContextMenu
          message={message}
          currentUserId={currentUserId}
          onReply={handleReply}
          onEdit={handleEdit}
          onCopy={handleCopy}
          onResend={onResend}
          onDelete={onDelete}
          onForward={handleForward}
          onPin={onPin}
          onUnpin={onUnpin}
        >
          {/* ✅ ลด max-width เมื่อมี avatar (ทั้ง group และ direct) */}
          <div className={cn('max-w-[70%]', !isOwn && 'max-w-[calc(70%-40px)]')}>
            {messageContent}
          </div>
        </MessageContextMenu>
      ) : (
        <div className={cn('max-w-[70%]', !isOwn && 'max-w-[calc(70%-40px)]')}>
          {messageContent}
        </div>
      )}
    </div>
  );
});

export default MessageItem;
