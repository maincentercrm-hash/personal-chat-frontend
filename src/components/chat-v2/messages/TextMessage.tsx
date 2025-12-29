/**
 * TextMessage - Simple text message component
 *
 * Features:
 * - Auto-linkify URLs
 * - Emoji-only detection (larger size, no bubble)
 * - Inline time (Telegram-style)
 * - Multiline support
 * - Reply preview
 * - Forwarded indicator
 * - Edited indicator
 * - Mentions highlighting
 */

import { memo, useMemo } from 'react';
import type { MessageDTO } from '@/types/message.types';
import { MessageBubble } from '../MessageItem/MessageBubble';
import { MessageTime } from '../MessageItem/MessageTime';
import { MessageStatus, getMessageStatus } from '../MessageItem/MessageStatus';
import { ReplyPreview } from './ReplyPreview';
import { ForwardedIndicator } from './ForwardedIndicator';
import { UserProfilePopover } from '@/components/shared/UserProfilePopover';
import type { MessagePosition } from '../MessageList/types';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface TextMessageProps {
  /** Message data */
  message: MessageDTO;

  /** Is own message */
  isOwn: boolean;

  /** Position in group */
  position: MessagePosition;

  /** Formatted time string */
  time: string;

  /** Show sender name (group chat) */
  showSender?: boolean;

  /** Sender name */
  senderName?: string;

  /** Jump to replied message */
  onJumpToReply?: () => void;
}

// ============================================
// Helpers
// ============================================

// Check if content is emoji-only (1-3 emojis)
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}){1,3}$/u;

function isEmojiOnly(content: string): boolean {
  const trimmed = content.trim();
  return EMOJI_REGEX.test(trimmed);
}

// Simple URL detection and linkify
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface MentionInfo {
  user_id: string;
  username: string;
  start_index: number;
  length: number;
}

function renderContentWithMentions(
  content: string,
  mentions?: MentionInfo[],
  _isOwn?: boolean
): (string | JSX.Element)[] {
  // If no mentions, just linkify URLs
  if (!mentions || mentions.length === 0) {
    return linkifyContent(content);
  }

  // Sort mentions by start_index (descending for safe replacement)
  const sortedMentions = [...mentions].sort((a, b) => a.start_index - b.start_index);

  const result: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, idx) => {
    // Add text before mention
    if (mention.start_index > lastIndex) {
      const beforeText = content.slice(lastIndex, mention.start_index);
      result.push(...linkifyContent(beforeText));
    }

    // Add mention
    const mentionText = content.slice(mention.start_index, mention.start_index + mention.length);
    result.push(
      <span
        key={`mention-${idx}`}
        className={cn(
          'px-0.5 rounded',
          'bg-[var(--mention-bg)] text-[var(--mention-text)]',
          'cursor-pointer hover:underline'
        )}
      >
        {mentionText}
      </span>
    );

    lastIndex = mention.start_index + mention.length;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    result.push(...linkifyContent(content.slice(lastIndex)));
  }

  return result;
}

function linkifyContent(content: string): (string | JSX.Element)[] {
  const parts = content.split(URL_REGEX);

  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--bubble-own-link)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// ============================================
// Component
// ============================================

export const TextMessage = memo(function TextMessage({
  message,
  isOwn,
  position,
  time,
  showSender,
  senderName,
  onJumpToReply,
}: TextMessageProps) {
  const content = message.content || '';
  const emojiOnly = useMemo(() => isEmojiOnly(content), [content]);
  const status = getMessageStatus(message, isOwn);

  // Get mentions from metadata
  const mentions = message.metadata?.mentions as MentionInfo[] | undefined;

  // Check for reply and forward
  const hasReply = !!message.reply_to_message;
  const isForwarded = !!message.is_forwarded && !!message.forwarded_from;

  // Emoji-only: larger text, no bubble (but still show reply/forward if any)
  if (emojiOnly && !hasReply && !isForwarded) {
    return (
      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        <span className="text-[48px] leading-none">{content}</span>
        <div className="flex items-center gap-1 mt-1">
          {message.is_edited && (
            <span className="text-[11px] text-muted-foreground">แก้ไข</span>
          )}
          <MessageTime time={time} isOwn={isOwn} variant="block" />
          {status && <MessageStatus status={status} />}
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <MessageBubble isOwn={isOwn} position={position}>
      {/* Forwarded indicator */}
      {isForwarded && message.forwarded_from && (
        <ForwardedIndicator forwardedFrom={message.forwarded_from} isOwn={isOwn} />
      )}

      {/* Reply preview */}
      {hasReply && message.reply_to_message && (
        <ReplyPreview
          replyTo={message.reply_to_message}
          isOwn={isOwn}
          onJumpToMessage={onJumpToReply}
        />
      )}

      {/* Sender name (group chat, first in group) - ✅ Clickable */}
      {showSender && senderName && !isForwarded && message.sender_id && (
        <UserProfilePopover
          userId={message.sender_id}
          displayName={senderName}
          profileImageUrl={message.sender_info?.profile_image_url || message.sender?.profile_image_url}
          username={message.sender_info?.username || message.sender?.username}
        >
          <span className="text-[13px] font-medium text-primary mb-1 inline-block hover:underline">
            {senderName}
          </span>
        </UserProfilePopover>
      )}

      {/* Content with inline time */}
      <div className="text-[14px] leading-[1.3125] break-words whitespace-pre-wrap">
        {renderContentWithMentions(content, mentions, isOwn)}

        {/* Inline time + status (Telegram-style) */}
        <span className="float-right ml-2 mt-[3px] flex items-center gap-0.5">
          {message.is_edited && (
            <span className={cn(
              'text-[11px]',
              isOwn ? 'text-[var(--bubble-own-time)]' : 'text-[var(--bubble-other-time)]'
            )}>
              แก้ไข
            </span>
          )}
          <MessageTime time={time} isOwn={isOwn} variant="inline" className="!float-none !ml-0 !mt-0" />
          {status && <MessageStatus status={status} />}
        </span>
      </div>
    </MessageBubble>
  );
});

export default TextMessage;
