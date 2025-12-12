/**
 * MessageContent - Renders appropriate component based on message type
 */

import { memo } from 'react';
import type { MessageDTO } from '@/types/message.types';
import type { MessagePosition } from '../MessageList/types';
import { TextMessage } from '../messages/TextMessage';
import { ImageMessage } from '../messages/ImageMessage';
import { FileMessage } from '../messages/FileMessage';
import { StickerMessage } from '../messages/StickerMessage';
import { AlbumMessage } from '../messages/AlbumMessage';
import { VideoMessage } from '../messages/VideoMessage';
import { SystemMessage } from '../messages/SystemMessage';

// ============================================
// Props
// ============================================

interface MessageContentProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Position in group */
  position: MessagePosition;

  /** Formatted time string */
  time: string;

  /** Show sender name (group chat, first in group) */
  showSender?: boolean;

  /** Sender name */
  senderName?: string;

  /** Media click handler */
  onMediaClick?: (index?: number) => void;

  /** Jump to replied message */
  onJumpToReply?: () => void;
}

// ============================================
// Component
// ============================================

export const MessageContent = memo(function MessageContent({
  message,
  isOwn,
  position,
  time,
  showSender,
  senderName,
  onMediaClick,
  onJumpToReply,
}: MessageContentProps) {
  const messageType = message.message_type;

  // Deleted message
  if (message.is_deleted) {
    return (
      <div className="italic text-muted-foreground text-sm px-3 py-2">
        ข้อความนี้ถูกลบแล้ว
      </div>
    );
  }

  // Route to appropriate component
  switch (messageType) {
    case 'text':
      return (
        <TextMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
          showSender={showSender}
          senderName={senderName}
          onJumpToReply={onJumpToReply}
        />
      );

    case 'image':
      return (
        <ImageMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
          onImageClick={() => onMediaClick?.(0)}
        />
      );

    case 'file':
      return (
        <FileMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
        />
      );

    case 'sticker':
      return (
        <StickerMessage
          message={message}
          isOwn={isOwn}
          time={time}
        />
      );

    case 'album':
      return (
        <AlbumMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
          onMediaClick={onMediaClick}
        />
      );

    case 'video':
      return (
        <VideoMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
          onVideoClick={() => onMediaClick?.(0)}
        />
      );

    case 'system':
      return <SystemMessage message={message} />;

    default:
      // Fallback to text for unknown types
      return (
        <TextMessage
          message={message}
          isOwn={isOwn}
          position={position}
          time={time}
          showSender={showSender}
          senderName={senderName}
          onJumpToReply={onJumpToReply}
        />
      );
  }
});

export default MessageContent;
