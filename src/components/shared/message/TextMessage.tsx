// src/components/shared/message/TextMessage.tsx
import React, { memo, useMemo } from 'react';
import type { MessageDTO } from '@/types/message.types';
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
 * ✅ Optimized: memo + useMemo for linkifyText
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
  // ✅ Memoize linkified content to avoid re-processing on every render
  const linkifiedContent = useMemo(
    () => linkifyText(
      message.content,
      'underline hover:opacity-80 break-all'
    ),
    [message.content]
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
        <p className="text-sm whitespace-pre-wrap">{linkifiedContent}</p>
        {/* Edit Indicator */}
        {message.is_edited && (
          <div className={` mt-1 opacity-70 ${
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
    prevProps.message.updated_at === nextProps.message.updated_at
  );
});

TextMessage.displayName = 'TextMessage';

export default TextMessage;