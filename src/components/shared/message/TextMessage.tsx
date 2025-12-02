// src/components/shared/message/TextMessage.tsx
import React, { memo, useMemo } from 'react';
import type { MessageDTO } from '@/types/message.types';
import type { MentionMetadata } from '@/types/mention.types';
import MessageStatusIndicator from './MessageStatusIndicator';
import { linkifyText } from '@/utils/messageTextUtils';

interface TextMessageProps {
  message: MessageDTO;
  isUser: boolean;
  formatTime: (timestamp: string) => string;
  messageStatus?: string;
  isBusinessView?: boolean;
  isGroupChat?: boolean;
  senderName?: string;
}

/**
 * Process text with mentions and linkify
 */
function processMessageContent(content: string, metadata?: any): string {
  let result = content;

  // First, process mentions if they exist
  if (metadata?.mentions && Array.isArray(metadata.mentions)) {
    const mentions = metadata.mentions as MentionMetadata[];

    // Sort by start_index descending to process from end to start
    const sortedMentions = [...mentions]
      .filter((m) => m.start_index !== undefined && m.length !== undefined)
      .sort((a, b) => b.start_index! - a.start_index!);

    sortedMentions.forEach((mention) => {
      // ✅ Type guard: start_index และ length ถูก filter แล้ว แต่ TypeScript ยังคิดว่าเป็น optional
      const start = mention.start_index!; // Non-null assertion
      const end = start + mention.length!;
      const mentionText = content.substring(start, end);

      result =
        result.substring(0, start) +
        `<span class="mention" data-user-id="${mention.user_id}">` +
        mentionText +
        `</span>` +
        result.substring(end);
    });
  }

  // Then linkify URLs (this is a simple implementation, adjust as needed)
  // Note: If linkifyText returns React elements, you may need to adjust this
  return result;
}

/**
 * ✅ Optimized: memo + useMemo for content processing
 */
const TextMessage: React.FC<TextMessageProps> = memo(({
  message,
  isUser,
  formatTime,
  messageStatus,
  isBusinessView,
  isGroupChat,
  senderName
}) => {
  // Check if message has mentions
  const hasMentions = useMemo(
    () => message.metadata?.mentions && Array.isArray(message.metadata.mentions) && message.metadata.mentions.length > 0,
    [message.metadata]
  );

  // ✅ Memoize processed content
  const processedContent = useMemo(() => {
    if (hasMentions) {
      return processMessageContent(message.content, message.metadata);
    }
    return null;
  }, [message.content, message.metadata, hasMentions]);

  // ✅ Memoize linkified content for non-mention messages
  const linkifiedContent = useMemo(
    () => !hasMentions ? linkifyText(message.content, 'underline hover:opacity-80 break-all') : null,
    [message.content, hasMentions]
  );

  return (
    <>
      <div
        className={`rounded-2xl px-4 py-2 border ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none border-transparent ml-auto'
            : 'bg-card text-card-foreground rounded-tl-none border-border mr-auto'
        }`}
        style={{ minHeight: '35px' }}
      >
        {hasMentions ? (
          <p
            className="text-sm whitespace-pre-wrap select-text mention-container"
            dangerouslySetInnerHTML={{ __html: processedContent || '' }}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap select-text">{linkifiedContent}</p>
        )}
        {/* Edit Indicator */}
        {message.is_edited && (
          <div className={` mt-1 opacity-70 text-xs ${
            isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
          }`}>
            <span>แก้ไขแล้ว</span>
            {message.edit_count > 1 && (
              <span> ({message.edit_count} ครั้ง)</span>
            )}
          </div>
        )}
      </div>
      <div
        className={`flex items-center  mt-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* แสดงชื่อผู้ส่งในกรณีต่อไปนี้:
            1. แชทกลุ่มและไม่ใช่ข้อความของตัวเอง
            2. หรือเป็นข้อความจากธุรกิจ (Business View) */}
        {((isGroupChat && !isUser) || (isBusinessView && message.sender_type === 'business')) && (
          <span className="text-muted-foreground text-xs mr-1">
            {senderName} ·
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {formatTime(message.is_edited ? message.updated_at : message.created_at)}
        </span>
        {isUser && <MessageStatusIndicator status={messageStatus} />}
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_edited === nextProps.message.is_edited &&
    prevProps.message.edit_count === nextProps.message.edit_count &&
    prevProps.messageStatus === nextProps.messageStatus &&
    prevProps.message.updated_at === nextProps.message.updated_at &&
    prevProps.message.metadata === nextProps.message.metadata
  );
});

TextMessage.displayName = 'TextMessage';

export default TextMessage;